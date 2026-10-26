namespace backend.Services;

/// <summary>
/// Development storage provider. Assets are kept under the application's Images directory
/// and exposed by Program.cs at /images, so catalogue work does not require cloud credentials.
/// </summary>
public sealed class LocalStorageService : IStorageService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<LocalStorageService> _logger;
    private readonly string _rootPath;
    private readonly string _publicBaseUrl;

    public LocalStorageService(
        IWebHostEnvironment environment,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<LocalStorageService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
        _rootPath = Path.Combine(environment.ContentRootPath, "Images");
        _publicBaseUrl = (configuration["LocalStorage:PublicBaseUrl"] ?? "http://localhost:5248").TrimEnd('/');
        Directory.CreateDirectory(_rootPath);
    }

    public async Task<(string PublicId, long Version)> UploadImageAsync(Stream stream, string filename, string folder = "watches")
    {
        var key = BuildKey(filename, folder);
        await WriteAsync(stream, key);
        return (key, DateTimeOffset.UtcNow.ToUnixTimeSeconds());
    }

    public async Task<string> UploadImageFromUrlAsync(string imageUrl, string publicId, string folder = "watches")
    {
        try
        {
            using var client = _httpClientFactory.CreateClient();
            using var response = await client.GetAsync(imageUrl, HttpCompletionOption.ResponseHeadersRead);
            response.EnsureSuccessStatusCode();

            var extension = Path.GetExtension(publicId);
            if (string.IsNullOrWhiteSpace(extension))
                extension = ExtensionFor(response.Content.Headers.ContentType?.MediaType) ?? ".jpg";

            var key = BuildKey(publicId + (Path.HasExtension(publicId) ? string.Empty : extension), folder);
            await using var stream = await response.Content.ReadAsStreamAsync();
            await WriteAsync(stream, key);
            return key;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unable to save image locally from {Url}", imageUrl);
            return string.Empty;
        }
    }

    public Task<bool> DeleteImageAsync(string publicId)
    {
        var path = ResolvePath(publicId);
        if (File.Exists(path)) File.Delete(path);
        return Task.FromResult(true);
    }

    public Task<List<string>> ListAssetsByPrefixAsync(string prefix)
    {
        var normalizedPrefix = NormalizeKey(prefix);
        var assets = Directory.EnumerateFiles(_rootPath, "*", SearchOption.AllDirectories)
            .Select(path => Path.GetRelativePath(_rootPath, path).Replace('\\', '/'))
            .Where(key => key.StartsWith(normalizedPrefix, StringComparison.OrdinalIgnoreCase))
            .ToList();
        return Task.FromResult(assets);
    }

    public Task<bool> RenameAssetAsync(string fromPublicId, string toPublicId)
    {
        var from = ResolvePath(fromPublicId);
        var to = ResolvePath(toPublicId);
        if (!File.Exists(from)) return Task.FromResult(false);
        Directory.CreateDirectory(Path.GetDirectoryName(to)!);
        File.Move(from, to, overwrite: true);
        return Task.FromResult(true);
    }

    public string? GetPublicUrl(string? publicId, long? version = null)
    {
        if (string.IsNullOrWhiteSpace(publicId)) return null;
        if (Uri.TryCreate(publicId, UriKind.Absolute, out _)) return publicId;
        // Demo catalogue images are served by the frontend from /public/catalogue.
        if (publicId.StartsWith("/catalogue/", StringComparison.Ordinal)) return publicId;
        var url = $"{_publicBaseUrl}/images/{NormalizeKey(publicId)}";
        return version.HasValue ? $"{url}?v={version.Value}" : url;
    }

    public Task<(string PresignedUrl, string Key)> GeneratePresignedUploadUrlAsync(string fileName, string folder, string contentType, int expiryMinutes = 15)
        => Task.FromResult((string.Empty, string.Empty));

    private async Task WriteAsync(Stream source, string key)
    {
        var path = ResolvePath(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var destination = File.Create(path);
        await source.CopyToAsync(destination);
    }

    private string BuildKey(string filename, string folder)
    {
        var baseName = Path.GetFileName(filename);
        if (string.IsNullOrWhiteSpace(baseName)) baseName = "image.jpg";
        return NormalizeKey(Path.Combine(folder, baseName));
    }

    private string ResolvePath(string key)
    {
        var normalized = NormalizeKey(key);
        var path = Path.GetFullPath(Path.Combine(_rootPath, normalized));
        var root = Path.GetFullPath(_rootPath) + Path.DirectorySeparatorChar;
        if (!path.StartsWith(root, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Image path is outside local storage.");
        return path;
    }

    private static string NormalizeKey(string key)
    {
        var normalized = key.Replace('\\', '/').TrimStart('/');
        if (normalized.Split('/').Any(segment => segment is "." or ".."))
            throw new InvalidOperationException("Invalid image path.");
        return normalized;
    }

    private static string? ExtensionFor(string? contentType) => contentType switch
    {
        "image/png" => ".png",
        "image/webp" => ".webp",
        "image/gif" => ".gif",
        "image/jpeg" => ".jpg",
        _ => null
    };
}
