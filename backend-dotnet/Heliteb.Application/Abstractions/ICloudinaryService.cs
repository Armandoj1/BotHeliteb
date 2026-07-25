namespace Heliteb.Application.Abstractions;

public interface ICloudinaryService
{
    Task<string> UploadImageAsync(string publicId, Stream content, CancellationToken ct = default);

    Task<string> UploadRawAsync(string publicId, Stream content, CancellationToken ct = default);
}
