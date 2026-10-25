// One vocabulary for the facets a shopper names and the catalogue records, read by the query parser
// and by every constraint check, so a word cannot mean one thing in a query and another in a record.
// Labels are the ones the filter bar already shows (frontend COMPLICATION_OPTIONS).
using System.Text.RegularExpressions;

namespace backend.Services;

public static class FacetLexicon
{
    /// A complication as the filter bar names it, how a shopper says it, and how the catalogue writes it.
    /// ClaimPattern is the stricter reading for a reply's prose, where "lunar" or "chime" is usually a
    /// figure of speech; null means the query pattern serves both.
    public sealed record Complication(string Label, string QueryPattern, string[] RecordForms, string? ClaimPattern = null);

    // The parser used to put the label itself into the intent and the checks looked for that label in
    // the catalogue's functions list, where "Moonphase" and "GMT / World Time" never appear: the list says
    // "moon phase" and "second time zone". Every brief naming either came back empty.
    public static readonly Complication[] Complications =
    [
        new("Chronograph", @"chronographs?|chrono|stopwatch|split[- ]seconds?|rattrapante|time\s+a\s+lap", ["chronograph"],
            @"chronographs?|chrono|split[- ]seconds?|rattrapante"),
        new("Perpetual Calendar", @"perpetual(?:\s+calendars?)?", ["perpetual"]),
        new("Annual Calendar", @"annual\s+calendars?", ["annual calendar"]),
        new("Moonphase", @"moon[- ]?phases?|phases?\s+of\s+the\s+moon|lunar", ["moon"],
            @"moon[- ]?phases?|phases?\s+of\s+the\s+moon"),
        // In prose "Tourbillon" is also this shop's name, so a reply claims one only as a thing it has.
        new("Tourbillon", @"tourbillons?", ["tourbillon"],
            @"(?:a|an|the|its|flying|with)\s+tourbillons?|tourbillons?\s+(?:cage|carriage|regulator|escapement)"),
        new("Minute Repeater", @"(?:minute\s+)?repeaters?|chim(?:e|es|ing)\b", ["repeater", "sonnerie"],
            @"(?:minute\s+)?repeaters?|sonnerie"),
        new("GMT / World Time",
            @"gmt|world\s*tim(?:e|er)|dual\s+time|second\s+time[- ]?zones?|two\s+time[- ]?zones|home\s+time|travel\s+time",
            ["gmt", "world time", "worldtime", "second time", "dual time", "home time", "time zone", "time-zone"],
            @"gmt|world\s*tim(?:e|er)|dual\s+time|second\s+time[- ]?zones?|two\s+time[- ]?zones"),
        new("Flyback", @"flyback", ["flyback"]),
        // "power reserve" alone is usually how long it runs; only the dial display is a complication.
        new("Power Reserve", @"power[- ]reserve\s+(?:indicator|display|gauge)", ["power-reserve", "power reserve"]),
        new("Alarm", @"alarms?", ["alarm"]),
        new("Retrograde", @"retrograde", ["retrograde"]),
        new("Equation of Time", @"equation\s+of\s+time", ["equation"]),
        // Only a date shown on the dial: "with a date window", "the day, date and month". A bare
        // "date" is left alone, because this parser also reads concierge briefs like "a date night".
        new("Date",
            @"date\s*windows?|(?:with|has|have|shows?|showing)\s+(?:a\s+|the\s+)?dates?\b|\bday[\s,]+(?:and\s+)?date\b|\bdate\s+(?:display|function|complication)",
            ["date"]),
    ];

    /// The complication labels a query names, in the order the table lists them.
    public static List<string> ReadComplications(string query) =>
        Complications
            .Where(c => Regex.IsMatch(query, $@"\b(?:{c.QueryPattern})", RegexOptions.IgnoreCase))
            .Select(c => c.Label)
            .ToList();

    /// Whether a watch has a complication, given either a label or a catalogue term ("moon", "date").
    /// The functions list is read first; the model name is read too, because a record can leave a
    /// function out of the list and still name it, except for the moon, which "Moonwatch" and
    /// "Moonshine gold" name without having.
    public static bool RecordHasComplication(IReadOnlyCollection<string> functions, string? watchName, string labelOrTerm)
    {
        var forms = Resolve(labelOrTerm)?.RecordForms ?? [labelOrTerm];
        if (functions.Any(f => forms.Any(form => f.Contains(form, StringComparison.OrdinalIgnoreCase))))
            return true;
        if (forms.Contains("moon") || string.IsNullOrEmpty(watchName))
            return false;
        return forms.Any(form => Regex.IsMatch(watchName, $@"\b{Regex.Escape(form)}", RegexOptions.IgnoreCase));
    }

    /// A label, or a catalogue term that is one of a label's record forms, resolved to its entry.
    private static Complication? Resolve(string labelOrTerm) =>
        Complications.FirstOrDefault(c =>
            string.Equals(c.Label, labelOrTerm, StringComparison.OrdinalIgnoreCase)
            || c.RecordForms.Any(form => string.Equals(form, labelOrTerm, StringComparison.OrdinalIgnoreCase)));

    // -- Materials, dials and movement ------------------------------------------------------------
    // Forms are written the way QueryNormalizer.NormalizeText leaves text: lower case, no accents,
    // punctuation as spaces. A form matches at the start of a word, so "silver" finds "silvered" and
    // "red" never finds "silvered".

    /// A facet value and the ways a shopper or the catalogue writes it.
    public sealed record Term(string Label, string[] Forms);

    // Most specific first: "rose gold" is read as rose gold and its span consumed, so it is not also
    // read as plain gold. "Gold" as a stated material is every gold.
    public static readonly Term[] Materials =
    [
        new("Rose Gold", ["rose gold", "pink gold", "red gold", "everose", "sedna"]),
        new("White Gold", ["white gold"]),
        new("Yellow Gold", ["yellow gold"]),
        new("Gold", ["gold"]),
        new("Platinum", ["platinum", "platin"]),
        new("Titanium", ["titanium", "titan"]),
        new("Ceramic", ["ceramic"]),
        new("Carbon", ["carbon"]),
        new("Steel", ["stainless steel", "oystersteel", "steel"]),
    ];

    // The catalogue spells dials 112 ways. Order decides the single bucket NormaliseDialColour reports
    // ("silvered grey" is silver first); matching reads every family a dial belongs to.
    public static readonly Term[] DialColours =
    [
        new("Silver", ["silver", "argent"]),
        new("Black", ["black", "noir", "onyx", "ebony"]),
        new("Blue", ["blue", "bleu", "navy"]),
        new("Green", ["green", "vert", "olive", "khaki"]),
        new("White", ["white", "blanc", "ivory", "cream", "opalin"]),
        new("Grey", ["grey", "gray", "anthracite", "slate", "graphite", "charcoal"]),
        new("Brown", ["brown", "chocolate", "havana", "bronze"]),
        new("Salmon", ["salmon"]),
        new("Champagne", ["champagne"]),
        new("Skeleton", ["openwork", "skeleton", "sapphire"]),
        new("Pink", ["pink"]),
        new("Burgundy", ["burgundy", "bordeaux"]),
        new("Red", ["red"]),
        new("Purple", ["purple", "violet", "aubergine"]),
        new("Turquoise", ["turquoise"]),
        new("Yellow", ["yellow"]),
        new("Mother-of-pearl", ["mother of pearl", "nacre"]),
        new("Guilloche", ["guilloche"]),
        new("Enamel", ["enamel"]),
    ];

    // Dial types that name the dial on their own; a colour only counts beside "dial" or "face",
    // because "a white gold watch" asks for a metal, not a white dial. "Sapphire" is left out here:
    // on its own it is usually the crystal or the case back.
    private static readonly Term[] DialTypesThatStandAlone =
    [
        new("Skeleton", ["openwork", "skeleton"]),
        new("Mother-of-pearl", ["mother of pearl", "nacre"]),
        new("Guilloche", ["guilloche"]),
        new("Enamel", ["enamel"]),
    ];

    // Words that sit between colours and "dial" without being colours: "a deep blue sunburst dial".
    private static readonly HashSet<string> DialModifiers =
    [
        "or", "and", "deep", "dark", "light", "pale", "bright", "midnight", "intense", "matte", "matt",
        "glossy", "sunburst", "sunray", "lacquered", "textured", "coloured", "colored", "toned", "tone", "soft", "rich",
    ];

    public static readonly Term[] Movements =
    [
        new("Automatic", ["automatic", "self winding", "selfwinding", "spring drive", "auto winding"]),
        new("Manual-winding", ["manual", "hand wound", "hand winding", "hand wind", "crown wound", "wound by hand"]),
        new("Quartz", ["quartz", "battery", "electromechanical"]),
    ];

    /// Every family of a facet a text belongs to, in table order.
    public static List<string> FamiliesOf(Term[] vocabulary, string? text)
    {
        var normalised = QueryNormalizer.NormalizeText(text);
        if (normalised.Length == 0) return [];
        return vocabulary.Where(term => term.Forms.Any(form => StartsAWord(normalised, form))).Select(t => t.Label).ToList();
    }

    /// Whether a stored value belongs to a family, given its label or a plain term ("gold", "rose gold").
    /// Whether a dial label names a construction (openworked, enamel) rather than a colour.
    public static bool IsDialType(string label) => DialTypesThatStandAlone.Any(t => t.Label == label);

    public static bool RecordHas(Term[] vocabulary, string? stored, string labelOrTerm)
    {
        var term = vocabulary.FirstOrDefault(t => string.Equals(t.Label, labelOrTerm, StringComparison.OrdinalIgnoreCase));
        var normalised = QueryNormalizer.NormalizeText(stored);
        if (normalised.Length == 0) return false;
        return term == null
            ? StartsAWord(normalised, QueryNormalizer.NormalizeText(labelOrTerm))
            : term.Forms.Any(form => StartsAWord(normalised, form));
    }

    /// The materials a query names, most specific first, each span consumed once read.
    public static List<string> ReadMaterials(string query)
    {
        var text = " " + QueryNormalizer.NormalizeText(query) + " ";
        var found = new List<string>();
        foreach (var term in Materials)
        {
            foreach (var form in term.Forms)
            {
                var match = Regex.Match(text, $@"(?<![a-z0-9]){Regex.Escape(form)}");
                if (!match.Success) continue;
                if (!found.Contains(term.Label)) found.Add(term.Label);
                text = text.Remove(match.Index, match.Length).Insert(match.Index, new string(' ', match.Length));
            }
        }
        return found;
    }

    /// Whether ruling a material out also rules out a stated one: "no gold, even white gold" cannot
    /// then ask for white gold. Gold covers every gold; anything else covers only itself.
    public static bool MaterialCovers(string excluded, string stated) =>
        string.Equals(excluded, stated, StringComparison.OrdinalIgnoreCase)
        || (string.Equals(excluded, "gold", StringComparison.OrdinalIgnoreCase)
            && stated.EndsWith("Gold", StringComparison.OrdinalIgnoreCase));

    /// The dial colours and types a query asks for, and the word the shopper used for the first one.
    /// A colour counts when it sits in the run of words just before "dial" or "face", so "white gold
    /// watch with a black dial" asks for black; "salmon or champagne dials" asks for either.
    public static (List<string> Labels, string? Phrase) ReadDialColours(string query)
    {
        var labels = new List<string>();
        string? phrase = null;
        foreach (var (_, _, run) in DialRuns(query))
        {
            foreach (var word in run)
            {
                phrase ??= word;
                foreach (var label in FamiliesOf(DialColours, word))
                    if (!labels.Contains(label)) labels.Add(label);
            }
        }
        foreach (var label in FamiliesOf(DialTypesThatStandAlone, query))
            if (!labels.Contains(label)) labels.Add(label);
        return (labels, phrase);
    }

    /// Each run of dial colours and types a text names, where it starts and how long it is: "a deep
    /// blue sunburst dial", "the dial is blue". The concierge's claim check reads a reply with the same
    /// walk the parser reads a query with.
    public static List<(int Index, int Length, List<string> Words)> DialRuns(string text)
    {
        // Raw tokens keep the writer's spelling ("argenté", "silver-toned"); each is normalised only to
        // be compared, so a shopper's word can still rank their exact dial first.
        var tokens = Regex.Matches(text, @"[\p{L}\p{Nd}][\p{L}\p{Nd}'-]*").ToArray();
        var plain = tokens.Select(token => QueryNormalizer.NormalizeText(token.Value)).ToArray();
        var runs = new List<(int, int, List<string>)>();
        for (var i = 0; i < tokens.Length; i++)
        {
            if (plain[i] is not ("dial" or "dials" or "face" or "faces")) continue;
            var run = new List<string>();
            var first = i;
            var last = i;
            for (var j = i - 1; j >= 0; j--)
            {
                var isColour = FamiliesOf(DialColours, tokens[j].Value).Count > 0;
                if (!isColour && !DialModifiers.Contains(plain[j])) break;
                if (isColour) { run.Insert(0, tokens[j].Value); first = j; }
            }
            // "a dial in silver", "the dial is blue"
            if (run.Count == 0 && i + 2 < tokens.Length && plain[i + 1] is "in" or "is"
                && FamiliesOf(DialColours, tokens[i + 2].Value).Count > 0)
            {
                run.Add(tokens[i + 2].Value);
                last = i + 2;
            }
            if (run.Count == 0) continue;
            var start = tokens[first].Index;
            runs.Add((start, tokens[last].Index + tokens[last].Length - start, run));
        }
        return runs;
    }

    /// The movement families a query asks for. A refused one ("not automatic") is cut before the rest
    /// is read; "mechanical", or refusing one family and naming none, leaves the others.
    public static List<string> ReadMovements(string query, string exclusionLead)
    {
        var text = QueryNormalizer.NormalizeText(query);
        var refused = new List<string>();
        foreach (var term in Movements)
        {
            foreach (var form in term.Forms)
            {
                var match = Regex.Match(text, exclusionLead + $@"(?<![a-z0-9]){Regex.Escape(form)}", RegexOptions.IgnoreCase);
                if (!match.Success) continue;
                if (!refused.Contains(term.Label)) refused.Add(term.Label);
                text = text.Remove(match.Index, match.Length);
            }
        }
        var stated = FamiliesOf(Movements, text).Where(label => !refused.Contains(label)).ToList();
        if (stated.Count > 0) return stated;
        if (Regex.IsMatch(text, @"(?<![a-z0-9])mechanical")) return ["Automatic", "Manual-winding"];
        return refused.Count > 0 ? Movements.Select(t => t.Label).Where(l => !refused.Contains(l)).ToList() : [];
    }

    private static bool StartsAWord(string normalisedText, string form) =>
        Regex.IsMatch(normalisedText, $@"(?<![a-z0-9]){Regex.Escape(form)}");
}
