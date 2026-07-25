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
        return result.SecureUrl.ToString();
    }
}
