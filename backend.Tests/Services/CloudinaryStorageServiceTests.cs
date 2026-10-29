using backend.Services;
using Microsoft.Extensions.Configuration;
using Moq;

namespace backend.Tests.Services;

public class CloudinaryStorageServiceTests
{
    private static CloudinaryStorageService Create() => new(
        Mock.Of<ICloudinaryService>(),
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Cloudinary:CloudName"] = "qa-cloud"
        }).Build());

    [Theory]
    [InlineData("/catalogue/tissot-prx.webp")]
    [InlineData("https://example.test/watch.webp")]
    public void SwitchingUploadProviderPreservesExistingCatalogueImages(string original)
        => Assert.Equal(original, Create().GetPublicUrl(original, 123));

    [Fact]
    public void UploadedImageUsesVersionedOriginalWithoutResizingOrQualityLoss()
        => Assert.Equal("https://res.cloudinary.com/qa-cloud/image/upload/v123/watches/qa",
            Create().GetPublicUrl("watches/qa", 123));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData(" ")]
    public void MissingImageDoesNotGenerateInvalidCdnUrl(string? value)
        => Assert.Null(Create().GetPublicUrl(value));
}
