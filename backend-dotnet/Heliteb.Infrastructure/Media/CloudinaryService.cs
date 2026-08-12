using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Heliteb.Application.Abstractions;

namespace Heliteb.Infrastructure.Media;

public class CloudinaryOptions
{
    public string CloudName { get; set; } = null!;
    public string ApiKey { get; set; } = null!;
    public string ApiSecret { get; set; } = null!;
}

public class CloudinaryService : ICloudinaryService
{
    private readonly Cloudinary _cloudinary;

    public CloudinaryService(CloudinaryOptions options)
    {
        // Sin credenciales, el SDK construye una cuenta vacia y falla mucho mas
        // tarde con un NullReferenceException dentro de UploadAsync, que no dice
        // nada de la causa. Mejor decirlo aqui.
        if (string.IsNullOrWhiteSpace(options.CloudName)
            || string.IsNullOrWhiteSpace(options.ApiKey)
            || string.IsNullOrWhiteSpace(options.ApiSecret))
        {
            throw new InvalidOperationException(
                "Cloudinary no esta configurado: faltan Cloudinary:CloudName, Cloudinary:ApiKey " +
                "o Cloudinary:ApiSecret. Sin eso no se pueden subir los PDF de las cotizaciones.");
        }

        _cloudinary = new Cloudinary(new Account(options.CloudName, options.ApiKey, options.ApiSecret));
    }

    public async Task<string> UploadImageAsync(string publicId, Stream content, CancellationToken ct = default)
    {
        var uploadParams = new ImageUploadParams
        {
            File = new FileDescription(publicId, content),
            PublicId = publicId,
            Overwrite = true,
        };
        var result = await _cloudinary.UploadAsync(uploadParams, ct);
        return result.SecureUrl.ToString();
    }

    public async Task<string> UploadRawAsync(string publicId, Stream content, CancellationToken ct = default)
    {
        var uploadParams = new RawUploadParams
        {
            File = new FileDescription(publicId, content),
            PublicId = publicId,
            Overwrite = true,
        };
        var result = await _cloudinary.UploadAsync(uploadParams, cancellationToken: ct);
        if (result.SecureUrl is null)
        {
            throw new InvalidOperationException(
                "Cloudinary rechazo la subida del PDF: " + (result.Error?.Message ?? "sin detalle"));
        }

        return result.SecureUrl.ToString();
    }
}
