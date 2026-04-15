using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

IHost host = Host.CreateDefaultBuilder(args)
    .UseWindowsService(options =>
    {
        options.ServiceName = "MonitorGate Agent";
    })
    .ConfigureServices(services =>
    {
        services.AddHostedService<Worker>();
        services.AddSingleton<AgentFileLog>();
        services.AddSingleton<ActivityRepository>();
        services.AddSingleton<WindowTracker>();
        services.AddSingleton<BrowserInspector>();
        services.AddHttpClient<SyncClient>();
    })
    .Build();

await host.RunAsync();
