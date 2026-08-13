using System.Text.Json;
using Heliteb.Application.Abstractions;
using Heliteb.Application.Asesores;
using Heliteb.Application.Catalog;
using Heliteb.Application.Cotizaciones;
using Heliteb.Application.Cotizaciones.Dtos;
using Heliteb.Domain.Entities;
using Heliteb.Infrastructure.Data.Repositories;
using Microsoft.Extensions.Configuration;
using System.Security.Cryptography;

namespace Heliteb.Infrastructure.Cotizaciones;

public class CotizacionService : ICotizacionService
{
    private readonly CotizacionRepository _repository;
    private readonly IAsesorRepository _asesores;
    private readonly IProductQueries _productos;
    private readonly IPdfService _pdf;
    private readonly ICloudinaryService _cloudinary;
    private readonly IEmailService _email;
    private readonly IWhatsAppSender _whatsApp;
    private readonly string _enlaceBase;

    // Alfabeto sin caracteres que se confunden al dictar un enlace por telefono
    // (0/O, 1/l/I). 12 caracteres dan de sobra para que no se pueda adivinar.
    private const string AlfabetoToken = "abcdefghijkmnopqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789";
    private const int LargoToken = 12;

    public CotizacionService(
        CotizacionRepository repository,
        IAsesorRepository asesores,
        IProductQueries productos,
        IPdfService pdf,
        ICloudinaryService cloudinary,
        IEmailService email,
        IWhatsAppSender whatsApp,
        IConfiguration configuration)
    {
        _enlaceBase = (configuration["Cotizaciones:EnlaceBase"] ?? "https://api.helitebdev.cloud").TrimEnd('/');
        _repository = repository;
        _asesores = asesores;
        _productos = productos;
        _pdf = pdf;
        _cloudinary = cloudinary;
        _email = email;
        _whatsApp = whatsApp;
    }

    public async Task<CotizacionResultDto> GenerarAsync(GenerarCotizacionRequest request, CancellationToken ct = default)
    {
        // El backend es la única barrera contra bypasses de memoria del agente:
        // se re-valida SIEMPRE que telefono_asesor esté registrado, activo y con OTP
        // vigente, sin importar lo que el LLM "recuerde" de la conversación.
        var verificado = await _asesores.EstaVerificadoAsync(request.TelefonoAsesor, ct);
        if (!verificado)
        {
            throw new AsesorNoVerificadoException(request.TelefonoAsesor);
        }

        var lineas = new List<CotizacionPdfLinea>();
        decimal subtotal = 0;
        foreach (var codigoSap in request.CodigosSap)
        {
            var producto = await _productos.GetByCodigoSapAsync(codigoSap, ct);
            if (producto is null) continue;

            var precio = producto.PrecioMsrpCop ?? 0;
            lineas.Add(new CotizacionPdfLinea
            {
                CodigoSap = producto.CodigoSap,
                Modelo = producto.Modelo,
                Descripcion = producto.Descripcion,
                Cantidad = 1,
                PrecioUnitario = precio,
            });
            subtotal += precio;
        }

        var iva = Math.Round(subtotal * 0.19m, 0);
        var total = subtotal + iva;
        var folio = $"HEL-{DateTime.UtcNow:yyyyMMddHHmmss}";

        var pdfBytes = _pdf.GenerarCotizacionPdf(new CotizacionPdfModel
        {
            Folio = folio,
            Cliente = request.ClienteNombre,
            Asesor = request.Asesor,
            Lineas = lineas,
            Subtotal = subtotal,
            Iva = iva,
            Total = total,
        });

        string pdfUrl;
        using (var stream = new MemoryStream(pdfBytes))
        {
            pdfUrl = await _cloudinary.UploadRawAsync($"cotizaciones/{folio}", stream, ct);
        }

        var token = GenerarToken();

        var cotizacion = new Cotizacion
        {
            Folio = folio,
            Token = token,
            Cliente = request.ClienteNombre,
            ClienteEmail = request.ClienteEmail,
            Asesor = request.Asesor,
            Subtotal = subtotal,
            Iva = iva,
            Total = total,
            ProductosCount = lineas.Count,
            ProductosJson = JsonSerializer.Serialize(lineas),
            PdfUrl = pdfUrl,
        };
        await _repository.InsertAsync(cotizacion, ct);

        // Al cliente se le entrega el enlace propio, no el de Cloudinary: ese
        // revela proveedor, cuenta y carpeta, y el folio lleva marca de tiempo,
        // asi que se podrian enumerar cotizaciones de otros clientes.
        return new CotizacionResultDto
        {
            Folio = folio,
            Total = total,
            PdfUrl = $"{_enlaceBase}/c/{token}",
        };
    }

    private static string GenerarToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(LargoToken);
        var chars = new char[LargoToken];
        for (var i = 0; i < LargoToken; i++)
        {
            chars[i] = AlfabetoToken[bytes[i] % AlfabetoToken.Length];
        }

        return new string(chars);
    }

    public Task<Cotizacion?> GetByFolioAsync(string folio, CancellationToken ct = default) =>
        _repository.GetByFolioAsync(folio, ct);

    public Task<IReadOnlyList<Cotizacion>> ListAsync(CancellationToken ct = default) =>
        _repository.ListAsync(ct);

    public async Task EnviarPorEmailAsync(string folio, string destino, CancellationToken ct = default)
    {
        var cotizacion = await _repository.GetByFolioAsync(folio, ct)
            ?? throw new InvalidOperationException($"Cotización {folio} no encontrada.");

        using var http = new HttpClient();
        var pdfBytes = await http.GetByteArrayAsync(cotizacion.PdfUrl, ct);
        await _email.SendCotizacionAsync(destino, folio, pdfBytes, ct);
    }

    public async Task EnviarPorWhatsAppAsync(string folio, string destino, CancellationToken ct = default)
    {
        var cotizacion = await _repository.GetByFolioAsync(folio, ct)
            ?? throw new InvalidOperationException($"Cotización {folio} no encontrada.");

        await _whatsApp.SendMediaAsync(
            destino,
            $"Aquí tienes tu cotización {folio}, por un total de {cotizacion.Total:C0}.",
            cotizacion.PdfUrl,
            $"{folio}.pdf",
            ct: ct);
    }
}
