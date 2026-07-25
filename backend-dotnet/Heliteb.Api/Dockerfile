FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY Heliteb.Domain/Heliteb.Domain.csproj Heliteb.Domain/
COPY Heliteb.Application/Heliteb.Application.csproj Heliteb.Application/
COPY Heliteb.Infrastructure/Heliteb.Infrastructure.csproj Heliteb.Infrastructure/
COPY Heliteb.Agent/Heliteb.Agent.csproj Heliteb.Agent/
COPY Heliteb.Api/Heliteb.Api.csproj Heliteb.Api/
RUN dotnet restore Heliteb.Api/Heliteb.Api.csproj

COPY Heliteb.Domain/ Heliteb.Domain/
COPY Heliteb.Application/ Heliteb.Application/
COPY Heliteb.Infrastructure/ Heliteb.Infrastructure/
COPY Heliteb.Agent/ Heliteb.Agent/
COPY Heliteb.Api/ Heliteb.Api/
RUN dotnet publish Heliteb.Api/Heliteb.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS runtime
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Heliteb.Api.dll"]
