// Tests for brands a brief refuses. Read as requests, "anything but Rolex" and "skip anything from
// Omega" returned only the brand they ruled out; a refusal has to be told apart from a request.
using backend.Database;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Services;

public class BrandRefusalTests
{
    private const int Rolex = 1, Omega = 2, Patek = 3;

    private static async Task<QueryIntent?> Parse(string query)
    {
        var options = new DbContextOptionsBuilder<TourbillonContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var context = new TestTourbillonContext(options);
        context.Brands.AddRange(
            new Brand { Id = Rolex, Name = "Rolex", Slug = "rolex" },
            new Brand { Id = Omega, Name = "Omega", Slug = "omega" },
            new Brand { Id = Patek, Name = "Patek Philippe", Slug = "patek-philippe" });
        await context.SaveChangesAsync();
        var service = new WatchFinderService(
            new Mock<IHttpClientFactory>(MockBehavior.Strict).Object,
            new Mock<IDeterministicWatchSearchService>().Object,
            context,
            new WatchFilterMapper(),
            new QueryCacheService(context, NullLogger<QueryCacheService>.Instance),
            NullLogger<WatchFinderService>.Instance,
            new TestStorageService());
        return (await service.SearchCatalogueAsync(query)).QueryIntent;
    }

    [Theory]
    [InlineData("anything but Rolex, under fifteen grand", Rolex)]
    [InlineData("nothing from rolex please, budget is 15k max", Rolex)]
    [InlineData("automatics under 25k, but skip anything from Omega", Omega)]
    [InlineData("a dress watch under 30k, anything except Patek", Patek)]
    [InlineData("not into rolex, i see them everywhere, under 18k", Rolex)]
    public async Task A_brand_named_after_a_refusal_is_ruled_out(string query, int brandId)
    {
        var intent = await Parse(query);
        Assert.Contains(brandId, intent?.ExcludedBrandIds ?? []);
        Assert.NotEqual(brandId, intent?.BrandId);
    }

    [Theory]
    [InlineData("Rolex, no gold please", Rolex)]
    [InlineData("no gold case, Rolex preferred", Rolex)]
    public async Task A_refusal_of_something_else_leaves_the_brand_requested(string query, int brandId)
    {
        var intent = await Parse(query);
        Assert.Equal(brandId, intent?.BrandId);
        Assert.DoesNotContain(brandId, intent?.ExcludedBrandIds ?? []);
    }

    [Fact]
    public async Task One_brand_refused_and_another_asked_for_keeps_both_straight()
    {
        var intent = await Parse("Omega instead, anything but Rolex");
        Assert.Equal(Omega, intent?.BrandId);
        Assert.Contains(Rolex, intent?.ExcludedBrandIds ?? []);
    }
}
