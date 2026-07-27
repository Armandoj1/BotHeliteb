using System.Text;
using System.Text.Json;
using Heliteb.Agent;
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

// Login del panel: el asesor verifica su OTP (ver AuthController) y recibe un JWT.
// El propio API .NET nunca setea la cookie de sesion - eso lo hace el servidor de
// Astro (patron BFF), asi que aqui solo hace falta poder VALIDAR el token entrante.
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

// El panel (Astro, patron BFF) habla server-a-servidor con este API, asi que ya no
// depende de CORS para funcionar - se deja abierto solo por comodidad para probar
// directo desde el navegador/Swagger en dev; el JWT sigue siendo obligatorio de todas
// formas (FallbackPolicy), asi que no es una superficie de ataque nueva.
const string PanelCorsPolicy = "PanelCors";
builder.Services.AddCors(options =>
{
    options.AddPolicy(PanelCorsPolicy, policy =>
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
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
