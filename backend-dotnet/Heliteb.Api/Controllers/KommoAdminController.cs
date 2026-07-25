using Heliteb.Infrastructure.Messaging.Kommo;
using Microsoft.AspNetCore.Mvc;

namespace Heliteb.Api.Controllers;

/// <summary>
/// Setup de una sola vez para vincular el canal privado de Kommo (ChannelId/ChannelSecret,
/// ya creados a mano en el panel de desarrolladores de Kommo) a la cuenta del negocio
/// (AccountId) y obtener el scope_id que KommoChatSender necesita para cada envío.
/// Sin auth propia — igual que el resto de endpoints del API hoy (ver comentario de CORS
/// en Program.cs); llamarlo una vez y pegar el scope_id devuelto en appsettings.json.
/// </summary>
[ApiController]
[Route("api/kommo")]
public class KommoAdminController : ControllerBase
{
    private readonly KommoChannelConnector _connector;

    public KommoAdminController(KommoChannelConnector connector)
    {
        _connector = connector;
    }

    [HttpPost("connect")]
    public async Task<IActionResult> Connect(CancellationToken ct)
    {
        var scopeId = await _connector.ConnectAsync(ct);
        return Ok(new { scopeId });
    }
}
