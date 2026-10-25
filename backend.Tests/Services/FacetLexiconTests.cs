// Tests for the shared facet vocabulary. A word read one way from a query and another way from a
// record is how "Moonphase" briefs came back empty, so each mapping that could split is pinned here.
using backend.Services;

namespace backend.Tests.Services;

public class FacetLexiconTests
{
    [Theory]
    [InlineData("a moonphase on leather, under 40 thousand", "Moonphase")]
    [InlineData("platinum dress watch with a moon phase", "Moonphase")]
    [InlineData("a watch that shows the phases of the moon", "Moonphase")]
    [InlineData("gmt in steel on a bracelet", "GMT / World Time")]
    [InlineData("useful for tracking a second time zone when I travel", "GMT / World Time")]
    [InlineData("shows home time as well as local time", "GMT / World Time")]
    [InlineData("a watch that chimes the hours", "Minute Repeater")]
    [InlineData("something that can time a lap", "Chronograph")]
    [InlineData("a power reserve indicator on the dial", "Power Reserve")]
    public void A_query_is_read_into_the_filter_bar_label(string query, string label)
    {
        Assert.Contains(label, FacetLexicon.ReadComplications(query));
    }

    [Theory]
    [InlineData("a steel watch with a date window")]
    [InlineData("looking for a steel automatic with a date. 40mm is my limit")]
    [InlineData("shows the day, date and month together")]
    public void A_date_asked_for_is_the_date_complication(string query)
    {
        Assert.Contains("Date", FacetLexicon.ReadComplications(query));
    }

    [Theory]
    [InlineData("something to wear on a date night")]
    [InlineData("keep me up to date on new arrivals")]
    public void A_date_that_is_not_a_display_is_not_asked_for(string query)
    {
        // The concierge runs this parser too, and a hard date filter would answer "date night" badly.
        Assert.DoesNotContain("Date", FacetLexicon.ReadComplications(query));
    }

    [Fact]
    public void Hours_of_power_reserve_are_not_the_power_reserve_complication()
    {
        // "power reserve" on its own is how long the watch runs, which the parser reads as a figure.
        Assert.Empty(FacetLexicon.ReadComplications("an automatic with 60 hours of power reserve"));
    }

    [Theory]
    [InlineData(new[] { "Hours", "Moon phase" }, "Moonphase")]
    [InlineData(new[] { "Hours", "Moon phases" }, "Moonphase")]
    [InlineData(new[] { "Hours", "Second time zone" }, "GMT / World Time")]
    [InlineData(new[] { "Hours", "Grande sonnerie" }, "Minute Repeater")]
    [InlineData(new[] { "Hours", "Instantaneous date" }, "date")]
    public void A_label_or_term_is_found_in_the_catalogue_s_own_words(string[] functions, string labelOrTerm)
    {
        Assert.True(FacetLexicon.RecordHasComplication(functions, "", labelOrTerm));
    }

    [Fact]
    public void The_model_name_counts_except_for_the_moon()
    {
        // A record can leave a function out of its list and still name it.
        Assert.True(FacetLexicon.RecordHasComplication(["Hours"], "Split-Seconds Chronograph GMT Large Date", "date"));
        Assert.True(FacetLexicon.RecordHasComplication(["Hours"], "GMT-Master II", "GMT / World Time"));
        // "Moonwatch" names the moon without showing its phase.
        Assert.False(FacetLexicon.RecordHasComplication(["Hours", "Chronograph"], "Speedmaster Moonwatch", "Moonphase"));
    }

    [Theory]
    [InlineData("yellow gold pieces", new[] { "Yellow Gold" })]
    [InlineData("patek philipe in white gold", new[] { "White Gold" })]
    [InlineData("anything in titanium or ceramic", new[] { "Titanium", "Ceramic" })]
    [InlineData("a stainless steel watch", new[] { "Steel" })]
    [InlineData("rose gold dress watch", new[] { "Rose Gold" })]
    public void Materials_are_read_most_specific_first_and_all_of_them(string query, string[] expected)
    {
        Assert.Equal(expected, FacetLexicon.ReadMaterials(query));
    }

    [Theory]
    [InlineData("18K 4N pink gold", "Rose Gold", true)]
    [InlineData("18 ct Everose gold", "Rose Gold", true)]
    [InlineData("18K 4N pink gold", "Gold", true)]
    [InlineData("18K white gold", "Rose Gold", false)]
    [InlineData("yellow Rolesor (Oystersteel and yellow gold)", "Steel", true)]
    [InlineData("950 platinum", "Platinum", true)]
    [InlineData("18K 4N pink gold", "rose gold", true)]
    public void A_stored_material_belongs_to_every_family_it_names(string stored, string labelOrTerm, bool expected)
    {
        Assert.Equal(expected, FacetLexicon.RecordHas(FacetLexicon.Materials, stored, labelOrTerm));
    }

    [Fact]
    public void Refusing_gold_covers_every_gold_and_nothing_else()
    {
        Assert.True(FacetLexicon.MaterialCovers("gold", "White Gold"));
        Assert.True(FacetLexicon.MaterialCovers("steel", "Steel"));
        Assert.False(FacetLexicon.MaterialCovers("rose gold", "White Gold"));
        Assert.False(FacetLexicon.MaterialCovers("gold", "Steel"));
    }

    [Theory]
    [InlineData("salmon or champagne dials", new[] { "Salmon", "Champagne" })]
    [InlineData("a deep blue face", new[] { "Blue" })]
    [InlineData("a silver coloured face", new[] { "Silver" })]
    [InlineData("white gold watch with a black dial", new[] { "Black" })]
    [InlineData("anthracite or charcoal face", new[] { "Grey" })]
    [InlineData("a dial in silver", new[] { "Silver" })]
    [InlineData("guilloché dials", new[] { "Guilloche" })]
    [InlineData("mother of pearl", new[] { "Mother-of-pearl" })]
    public void Dial_colours_are_read_beside_the_word_dial(string query, string[] expected)
    {
        Assert.Equal(expected, FacetLexicon.ReadDialColours(query).Labels);
    }

    [Theory]
    [InlineData("a white gold watch")]
    [InlineData("rose gold dress watch on leather")]
    [InlineData("an automatic with a sapphire case back")]
    public void Colours_away_from_the_dial_are_not_dial_requests(string query)
    {
        Assert.Empty(FacetLexicon.ReadDialColours(query).Labels);
    }

    [Theory]
    [InlineData("silvered grey", "Grey", true)]
    [InlineData("silvered grey", "Red", false)]
    [InlineData("ebony black", "Black", true)]
    [InlineData("ebony black", "Brown", false)]
    [InlineData("Argenté", "Silver", true)]
    [InlineData("havana brown guilloché", "Guilloche", true)]
    public void A_stored_dial_belongs_to_every_family_it_names(string stored, string label, bool expected)
    {
        Assert.Equal(expected, FacetLexicon.RecordHas(FacetLexicon.DialColours, stored, label));
    }

    [Theory]
    [InlineData("crown wound movements under 30 thousand", new[] { "Manual-winding" })]
    [InlineData("manually wound, under 20 grand", new[] { "Manual-winding" })]
    [InlineData("battery powered, i do not want to wind anything", new[] { "Quartz" })]
    [InlineData("black dial on a leather strap. hand wound, not automatic", new[] { "Manual-winding" })]
    [InlineData("not quartz, and not over 36mm", new[] { "Automatic", "Manual-winding" })]
    [InlineData("a mechanical watch", new[] { "Automatic", "Manual-winding" })]
    [InlineData("self winding, four days of reserve", new[] { "Automatic" })]
    [InlineData("slate dial on leather, wound by hand", new[] { "Manual-winding" })]
    public void Movements_are_read_after_refusals_are_cut(string query, string[] expected)
    {
        Assert.Equal(expected, FacetLexicon.ReadMovements(query, WatchFinderService.ExclusionLead));
    }

    [Fact]
    public void A_record_without_the_complication_does_not_have_it()
    {
        Assert.False(FacetLexicon.RecordHasComplication(["Hours", "Minutes"], "Calatrava", "Moonphase"));
        Assert.False(FacetLexicon.RecordHasComplication(["Hours", "Minutes"], "Calatrava", "GMT / World Time"));
    }
}
