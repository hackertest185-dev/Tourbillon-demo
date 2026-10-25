// Tests for how the deterministic parser reads figures: budgets, case sizes and power reserve.
// Each case is a way people write a number that the parser once read as nothing, or as the wrong unit.
using backend.Database;
using backend.Models;
using backend.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace backend.Tests.Services;

public class NumericGrammarTests
{
    private static async Task<QueryIntent?> Parse(string query)
    {
        var options = new DbContextOptionsBuilder<TourbillonContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var context = new TestTourbillonContext(options);
        context.Brands.AddRange(
            new Brand { Id = 1, Name = "Audemars Piguet", Slug = "audemars-piguet" },
            new Brand { Id = 6, Name = "Glashütte Original", Slug = "glashutte-original" });
        await context.SaveChangesAsync();
        var service = new WatchFinderService(
            new Mock<IHttpClientFactory>(MockBehavior.Strict).Object,
            new Mock<IDeterministicWatchSearchService>().Object,
            context,
            new WatchFilterMapper(),
            new QueryCacheService(context, NullLogger<QueryCacheService>.Instance),
            NullLogger<WatchFinderService>.Instance,
            new TestStorageService());
        var result = await service.SearchCatalogueAsync(query);
        return result.QueryIntent;
    }

    [Theory]
    [InlineData("somewhere in the 60 to 90 thousand bracket", 60_000, 90_000)]
    [InlineData("40 to 60k range", 40_000, 60_000)]
    [InlineData("from 20k to 30k", 20_000, 30_000)]
    public async Task A_price_range_needs_no_between(string query, int min, int max)
    {
        var intent = await Parse(query);
        Assert.Equal(min, intent?.MinPrice);
        Assert.Equal(max, intent?.MaxPrice);
    }

    [Theory]
    [InlineData("starting from 100 thousand upwards", 100_000)]
    [InlineData("audemars piguet, 50k and over", 50_000)]
    [InlineData("anything 30k plus", 30_000)]
    [InlineData("at least 15,000 dollars", 15_000)]
    public async Task A_price_floor_can_follow_or_lead_the_figure(string query, int min)
    {
        var intent = await Parse(query);
        Assert.Equal(min, intent?.MinPrice);
        Assert.Null(intent?.MaxPrice);
    }

    [Theory]
    [InlineData("chronograph on rubber or a bracelet. no leather, 25k tops", 25_000)]
    [InlineData("a dress watch, 12k max", 12_000)]
    [InlineData("8000 or less", 8_000)]
    public async Task A_price_ceiling_can_follow_the_figure(string query, int max)
    {
        var intent = await Parse(query);
        Assert.Equal(max, intent?.MaxPrice);
        Assert.Null(intent?.MinPrice);
    }

    [Theory]
    [InlineData("case between 36 and 38 millimetres", 36, 38)]
    [InlineData("watches between 36mm and 39mm", 36, 39)]
    [InlineData("36 to 39mm watches", 36, 39)]
    public async Task A_size_range_is_a_size_and_never_a_price(string query, double min, double max)
    {
        var intent = await Parse(query);
        Assert.Equal(min, intent?.MinDiameterMm);
        Assert.Equal(max, intent?.MaxDiameterMm);
        Assert.Null(intent?.MinPrice);
        Assert.Null(intent?.MaxPrice);
    }

    [Theory]
    [InlineData("thirty-eight millimetres or smaller", null, 38.0)]
    [InlineData("forty-four millimetres and up", 44.0, null)]
    [InlineData("nothing wider than 36mm", null, 36.0)]
    public async Task A_spelled_out_size_reads_like_a_written_one(string query, double? min, double? max)
    {
        var intent = await Parse(query);
        Assert.Equal(min, intent?.MinDiameterMm);
        Assert.Equal(max, intent?.MaxDiameterMm);
    }

    [Theory]
    [InlineData("self winding, four days of reserve at least", 96, "72h – 100h")]
    [InlineData("a week of power reserve so it keeps running in the drawer", 168, "Over 100h")]
    [InlineData("at least 72 hours of power reserve", 72, "72h – 100h")]
    public async Task Power_reserve_in_days_or_weeks_is_read_as_hours(string query, int hours, string bucket)
    {
        // The bucket is the filter bar's; the hours are what the filter holds to, because the
        // bucket's floor of 72 would let a 72-hour watch answer a brief asking for four days.
        var intent = await Parse(query);
        Assert.Equal(hours, intent?.MinPowerReserveHours);
        Assert.Contains(bucket, intent?.PowerReserves ?? []);
    }

    [Theory]
    [InlineData("M126331-0001")]
    [InlineData("126331-0001")]
    [InlineData("5711/1A-010")]
    [InlineData("1410U/000G-H017")]
    public async Task A_reference_number_is_not_a_budget(string query)
    {
        // "M126331-0001" read as $126,331 down to $1,000 once, and the budget then filtered out the very
        // watch the reference names.
        var intent = await Parse(query);
        Assert.Null(intent?.MinPrice);
        Assert.Null(intent?.MaxPrice);
    }

    [Fact]
    public async Task The_verb_go_is_not_glashutte_original()
    {
        var intent = await Parse("i can go up to 8 thousand, not a dollar more");
        Assert.Null(intent?.BrandId);
        Assert.Equal(8_000, intent?.MaxPrice);
    }

    [Fact]
    public async Task GO_in_capitals_still_is()
    {
        var intent = await Parse("GO watches under 20k");
        Assert.Equal(6, intent?.BrandId);
    }
}
