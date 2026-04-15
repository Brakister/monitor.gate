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

        // Fallback: usa apenas o domínio derivado de padrões comuns no título.
        string cleaned = title.Replace(" - Google Chrome", string.Empty)
            .Replace(" - Microsoft Edge", string.Empty)
            .Replace(" - Mozilla Firefox", string.Empty)
            .Trim();

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
