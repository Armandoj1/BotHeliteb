# -*- coding: utf-8 -*-
"""
Suite de regresion del agente HELITEB.

Cada caso congela un bug real encontrado en conversaciones de WhatsApp: si un cambio
futuro (prompt, busqueda, modelo) rompe algo que ya funcionaba, esta suite lo detecta
antes de llegar a produccion.

Uso:
    python tests/regression_chat.py [--base-url http://localhost:5090]

Requiere la API corriendo en modo Development (usa /api/debug/chat, que no envia
WhatsApp real) con Postgres y Ollama arriba.
"""
import argparse
import json
import sys
import time
import urllib.request

CASOS = [
    {
        # Bug: recomendaba DVR de $654k-$780k para 1 camara de 2MP; las opciones
        # baratas de 4 canales ni siquiera llegaban al LLM (fallo semantico +
        # indice corrupto). Fix: filtros estructurados + boost de canales.
        "nombre": "dvr-economico-4-canales",
        "mensaje": "necesito un dvr economico de 4 canales para una sola camara analoga de 2mp",
        "debe_contener_alguno": ["DS-7204HGHI-M1/T", "188.930"],
        "no_debe_contener": ["No pude completar"],
    },
    {
        # Bug: la camara de 80m IR (DS-2CE16U1T-IT5F) aparecia solo a veces segun
        # como el LLM redactara la busqueda (posicion 2-8 del ranking por marca).
        # Fix: boost deterministico de alcance IR extraido por regex.
        "nombre": "bullet-ir-mayor-50m",
        "mensaje": "¿Qué cámaras bullet tienen rango IR mayor a 50 metros?",
        "debe_contener_alguno": ["DS-2CE16U1T-IT5F", "DS-2CE17H0T-IT5F", "DS-2CE17D0T-IT5F"],
        "no_debe_contener": ["no encontré ninguna", "No pude completar"],
    },
    {
        # Bug: el dato original del Excel decia 1 MP (inconsistente con la hoja de
        # inventario del mismo proveedor); ademas el agente cedia ante la correccion
        # del cliente sin re-verificar. Fix: dato corregido en BD + regla de prompt.
        "nombre": "dvr-7204hghi-soporta-2mp",
        "mensaje": "el DVR DS-7204HGHI-M1 soporta 2MP?",
        "debe_contener_alguno": ["2 MP", "2MP"],
        "no_debe_contener": ["No pude completar"],
    },
    {
        # Bug: la consulta compleja agotaba las 14 iteraciones reintentando una
        # busqueda sin resultados y terminaba en fallback. Fix: regla anti-bucle.
        "nombre": "sistema-ip-completo-no-fallback",
        "mensaje": "Armame un sistema ip de 4mp 4 camaras completo",
        "debe_contener_alguno": ["4 MP", "4MP"],
        "no_debe_contener": ["No pude completar"],
    },
    {
        # Comportamiento base: comparacion de dos modelos concretos por codigo.
        "nombre": "comparacion-modelos",
        "mensaje": "Compara el DS-2CD1023G0E-I con el DS-2CD1043G0-I",
        "debe_contener_todos": ["DS-2CD1023G0E-I", "DS-2CD1043G0-I"],
        "no_debe_contener": ["No pude completar"],
    },
    {
        # Bug: para "dvr de 8 canales" el ranking semantico podia ofrecer primero
        # opciones caras u otros canales. Fix: boost de canales ordenado por precio.
        "nombre": "dvr-8-canales-opciones-baratas",
        "mensaje": "recomiendame un dvr de 8 canales",
        "debe_contener_alguno": ["7108HGHI", "7208HGHI"],
        "no_debe_contener": ["No pude completar"],
    },
    {
        # Barrera de seguridad: un numero no registrado no puede cotizar.
        "nombre": "cotizar-sin-asesor-rechaza",
        "mensaje": "quiero cotizar 2 camaras DS-2CD1043G0-I",
        "debe_contener_alguno": ["asesor", "registrado", "administrador"],
        "no_debe_contener": ["folio", "PDF generado"],
    },
]


def llamar_agente(base_url, telefono, mensaje, timeout=90):
    payload = json.dumps({"telefono": telefono, "mensaje": mensaje}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/api/debug/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    inicio = time.time()
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        cuerpo = json.loads(resp.read().decode("utf-8"))
    return cuerpo["respuesta"], time.time() - inicio


def evaluar(caso, respuesta):
    fallos = []
    texto = respuesta.lower()

    if alguno := caso.get("debe_contener_alguno"):
        if not any(t.lower() in texto for t in alguno):
            fallos.append(f"no contiene ninguno de: {alguno}")

    for t in caso.get("debe_contener_todos", []):
        if t.lower() not in texto:
            fallos.append(f"falta: {t!r}")

    for t in caso.get("no_debe_contener", []):
        if t.lower() in texto:
            fallos.append(f"contiene texto prohibido: {t!r}")

    return fallos


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:5090")
    parser.add_argument("--solo", help="correr solo el caso con este nombre")
    args = parser.parse_args()

    # Telefonos unicos por corrida -> cada caso arranca con sesion limpia.
    base_tel = int(time.time()) % 100_000_000
    resultados = []

    casos = [c for c in CASOS if not args.solo or c["nombre"] == args.solo]
    for i, caso in enumerate(casos):
        telefono = f"5731{base_tel + i:08d}"
        print(f"[{i+1}/{len(casos)}] {caso['nombre']} ... ", end="", flush=True)
        try:
            respuesta, duracion = llamar_agente(args.base_url, telefono, caso["mensaje"])
            fallos = evaluar(caso, respuesta)
        except Exception as e:
            fallos = [f"error de red/API: {e}"]
            respuesta, duracion = "", 0.0

        estado = "PASS" if not fallos else "FAIL"
        print(f"{estado} ({duracion:.1f}s)")
        if fallos:
            for f in fallos:
                print(f"     - {f}")
            print(f"     respuesta: {respuesta[:300]}...")
        resultados.append((caso["nombre"], estado, duracion))

    passed = sum(1 for _, e, _ in resultados if e == "PASS")
    print(f"\n{passed}/{len(resultados)} casos OK")
    sys.exit(0 if passed == len(resultados) else 1)


if __name__ == "__main__":
    main()
