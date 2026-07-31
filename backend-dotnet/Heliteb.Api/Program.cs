using System.Text;
using System.Text.Json;
using Heliteb.Agent;
using Heliteb.Api.Agent;
using Heliteb.Api.Middlewares;
using Heliteb.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// El panel nuevo (Astro) consume el contrato en snake_case; sin esto, System.Text.Json
// serializa en camelCase por defecto y cada DTO quedaria desalineado con el frontend.
builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower);
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAgent();
// Arma un agente aislado pineado a un solo proveedor de embeddings, para
// "Comparar IA" (ver ComparacionChatController) - no interfiere con el switch
// compartido que usa el bot real de WhatsApp.
builder.Services.AddScoped<ComparacionAgentFactory>();

// Logging minimo de cada request (metodo, path, status, duracion) sin headers ni
// body - suficiente para diagnosticar en produccion sin depender de "docker compose
// logs" a ciegas, sin arriesgar loguear el JWT del panel o datos de clientes.
builder.Services.AddHttpLogging(o =>
{
    o.LoggingFields = Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestMethod
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.RequestPath
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.ResponseStatusCode
        | Microsoft.AspNetCore.HttpLogging.HttpLoggingFields.Duration;
});

// Login del panel: el asesor entra con email+password (ver AuthController) y recibe
// un JWT firmado. El panel (Astro, build estatico) lo guarda en el navegador y lo
// manda como Bearer en cada request, asi que aqui solo hace falta poder VALIDARLO.
var jwtSection = builder.Configuration.GetSection("Jwt");
var jwtSigningKey = jwtSection["SigningKey"] ?? throw new InvalidOperationException("Falta Jwt:SigningKey en la configuración.");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        // Sin esto, ASP.NET Core remapea "sub"/"name" a URIs largos de ClaimTypes al
        // validar el token (mapeo automatico de JwtSecurityTokenHandler) y
        // User.FindFirst(JwtRegisteredClaimNames.Sub) deja de encontrar el claim.
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidateAudience = true,
            ValidAudience = jwtSection["Audience"],
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });
// Protegido por defecto: cualquier controller nuevo queda exigiendo sesion de asesor
// salvo que se marque [AllowAnonymous] explicitamente (login y los dos webhooks, que
// ya tienen su propio esquema de verificacion - HMAC / secreto por query string).
builder.Services.AddAuthorization(o =>
    o.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

// El panel es un build estatico que corre en el navegador del usuario, asi que SI
// depende de CORS (llama a este API desde otro origen/puerto). "Cors:AllowedOrigins"
// (env var Cors__AllowedOrigins, coma-separado) fija el/los origenes reales en
// produccion; si no esta configurado, cae a abierto (comodo para dev/Swagger sin
// dominio). El JWT sigue siendo obligatorio de todas formas (FallbackPolicy), asi
// que un CORS abierto en dev no es, por si solo, una superficie de ataque nueva.
var allowedOrigins = builder.Configuration["Cors:AllowedOrigins"]
    ?.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
    ?? [];
const string PanelCorsPolicy = "PanelCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(PanelCorsPolicy, policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
        }
    });
});

var app = builder.Build();

// Primero de todo el pipeline: asi envuelve tambien Swagger/CORS/auth/routing y
// cualquier excepcion que se escape de un controller queda logueada y responde un
// JSON limpio en vez de un 500 vacio (ver ExceptionHandlingMiddleware).
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseHttpLogging();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(PanelCorsPolicy);
app.UseMiddleware<WebhookSecretMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Run();
