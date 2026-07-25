using System.Security.Cryptography;
using System.Text;

namespace Heliteb.Infrastructure.Messaging.Kommo;

/// <summary>
/// Firma HMAC-SHA1 compartida por KommoChatSender y KommoChannelConnector: Kommo
/// exige la misma cadena canónica "POST\n{Content-MD5}\n{Content-Type}\n{Date}\n{path}"
/// para cualquier POST a /v2/origin/custom/*, ya sea el connect inicial o el envío
/// de mensajes normal.
/// </summary>
public static class KommoRequestSigner
{
    private const string ContentType = "application/json";

    public static HttpRequestMessage BuildSignedPost(string path, string jsonBody, string channelSecret)
    {
        var date = DateTime.UtcNow.ToString("r");
        var bodyBytes = Encoding.UTF8.GetBytes(jsonBody);
        var contentMd5 = Convert.ToHexString(MD5.HashData(bodyBytes)).ToLowerInvariant();

        var canonicalString = $"POST\n{contentMd5}\n{ContentType}\n{date}\n{path}";
        var signatureBytes = HMACSHA1.HashData(Encoding.UTF8.GetBytes(channelSecret), Encoding.UTF8.GetBytes(canonicalString));
        var signature = Convert.ToHexString(signatureBytes).ToLowerInvariant();

        var request = new HttpRequestMessage(HttpMethod.Post, path)
        {
            Content = new StringContent(jsonBody, Encoding.UTF8, ContentType),
        };
        request.Headers.Date = DateTimeOffset.Parse(date);
        request.Content.Headers.ContentMD5 = Convert.FromHexString(contentMd5);
        request.Headers.Add("X-Signature", signature);

        return request;
    }
}
