using System.Text.RegularExpressions;

public sealed class BrowserInspector
{
    private static readonly HashSet<string> BrowserProcesses =
    [
        "chrome",
        "msedge",
        "firefox"
    ];

    private static readonly Regex UrlRegex = new(
        @"(https?://[^\s]+)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Regex DomainRegex = new(
        @"(?:^|\W)((?:[a-z0-9-]+\.)+[a-z]{2,})(?:$|\W)",
        RegexOptions.Compiled | RegexOptions.IgnoreCase
    );

    private static readonly Dictionary<string, string> KeywordDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        ["youtube"] = "youtube.com",
        ["instagram"] = "instagram.com",
        ["whatsapp"] = "web.whatsapp.com",
        ["github"] = "github.com",
        ["gitlab"] = "gitlab.com",
        ["stackoverflow"] = "stackoverflow.com",
        ["twitch"] = "twitch.tv",
        ["discord"] = "discord.com",
        ["telegram"] = "web.telegram.org",
        ["gmail"] = "mail.google.com",
        ["google docs"] = "docs.google.com",
        ["drive"] = "drive.google.com",
        ["notion"] = "notion.so",
        ["figma"] = "figma.com",
        ["netflix"] = "netflix.com",
        ["prime video"] = "primevideo.com",
        ["linkedin"] = "linkedin.com",
        ["reddit"] = "reddit.com",
        ["facebook"] = "facebook.com",
        ["tiktok"] = "tiktok.com",
        ["x.com"] = "x.com",
        ["twitter/x"] = "x.com",
        [" x "] = "x.com",
        ["twitter"] = "x.com"
    };

    public (string? Url, string? Domain) Inspect(string processName, string title)
    {
        if (!BrowserProcesses.Contains(processName.ToLowerInvariant()))
        {
            return (null, null);
        }

        // Melhor esforço para extrair URL diretamente do título, quando disponível.
        Match match = UrlRegex.Match(title);
        if (match.Success && Uri.TryCreate(match.Value, UriKind.Absolute, out Uri? uri))
        {
            return (uri.ToString(), uri.Host);
        }

        Match domainMatch = DomainRegex.Match(title);
        if (domainMatch.Success)
        {
            return (null, domainMatch.Groups[1].Value.ToLowerInvariant());
        }

        // Fallback: usa apenas o domínio derivado de padrões comuns no título.
        string cleaned = title.Replace(" - Google Chrome", string.Empty)
            .Replace(" - Microsoft Edge", string.Empty)
            .Replace(" - Mozilla Firefox", string.Empty)
            .Trim();

        // Muitas abas usam formato "Titulo - Site" ou "Site | Titulo".
        string[] titleChunks = cleaned.Split(['-', '|', ':'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (string chunk in titleChunks)
        {
            Match chunkDomain = DomainRegex.Match(chunk);
            if (chunkDomain.Success)
            {
                return (null, chunkDomain.Groups[1].Value.ToLowerInvariant());
            }
        }

        foreach (KeyValuePair<string, string> entry in KeywordDomains)
        {
            if (cleaned.Contains(entry.Key, StringComparison.OrdinalIgnoreCase))
            {
                return (null, entry.Value);
            }
        }

        if (cleaned.Contains('.') && !cleaned.Contains(' '))
        {
            string candidate = cleaned.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                ? cleaned
                : $"https://{cleaned}";

            if (Uri.TryCreate(candidate, UriKind.Absolute, out Uri? hostUri))
            {
                return (null, hostUri.Host);
            }
        }

        return (null, null);
    }
}
