using System.Diagnostics;
using System.Text.Json;

namespace Heliteb.Api.Middlewares;

/// <summary>
/// Red de seguridad global: los webhooks de WhatsApp/Kommo ya atrapan sus propias
/// excepciones paso a paso (ver WhatsAppWebhookController/KommoWebhookController,
/// que siempre deben responder 200 al CRM pase lo que pase), pero el resto de
/// controllers (panel: productos, cotizaciones, asesores, etc.) no tenian ninguna
/// red - una excepcion sin capturar llegaba al cliente como un 500 vacio y sin
/// quedar logueada en ningun lado.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var traceId = Activity.Current?.Id ?? context.TraceIdentifier;
            _logger.LogError(ex, "Excepcion no manejada en {Method} {Path} (trace {TraceId})",
                context.Request.Method, context.Request.Path, traceId);

            if (context.Response.HasStarted)
            {
                // Ya se escribio parte de la respuesta (ej. streaming) - no se puede
                // reescribir el status/body, asi que se deja que ASP.NET Core la corte.
                throw;
            }

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new
            {
                error = "Ocurrio un error interno. Si persiste, contacta a soporte con este codigo.",
                trace_id = traceId,
            }));
        }
    }
}
