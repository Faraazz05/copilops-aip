"""Interactive HTML map of Belgian/Luxembourg aeronautical data.

Reads from the SQLite database and generates a multi-layer folium map.

Usage (from project root):
    python analysis/interactive_map.py --db data/aip.db --edition 2026-10-01
    # Opens analysis/aerodrome_map.html in your browser
"""
from __future__ import annotations

import argparse
import sqlite3
import webbrowser
from pathlib import Path

import folium
from folium import plugins

# Target airports for prominent display
TARGET_AIRPORTS = {"EBBR", "EBLG", "EBCI"}

# Colour palette
COLOURS = {
    "target_airport":  "#d7263d",   # red
    "other_airport":   "#1b4332",   # dark green
    "waypoint":        "#1565c0",   # blue
    "navaid_vor":      "#7b1fa2",   # purple
    "navaid_ils":      "#e65100",   # orange
    "navaid_ndb":      "#00695c",   # teal
    "navaid_other":    "#546e7a",   # slate
}


def load_aerodromes(conn: sqlite3.Connection, edition: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT f1.entity_key,
               CAST(f1.value AS REAL) AS lat,
               CAST(f2.value AS REAL) AS lon
          FROM facts f1
          JOIN facts f2 ON f1.edition = f2.edition
                       AND f1.entity_type = f2.entity_type
                       AND f1.entity_key  = f2.entity_key
         WHERE f1.edition     = ?
           AND f1.entity_type = 'aerodrome'
           AND f1.field       = 'arp_latitude'
           AND f2.field       = 'arp_longitude'
        """,
        (edition,),
    ).fetchall()
    result = []
    for icao, lat, lon in rows:
        if lat is None or lon is None:
            continue
        # pull extra fields
        fields = {
            row[0]: row[1]
            for row in conn.execute(
                "SELECT field, value FROM facts WHERE edition=? AND entity_type='aerodrome' AND entity_key=?",
                (edition, icao),
            )
        }
        result.append({"icao": icao, "lat": lat, "lon": lon, **fields})
    return result


def load_waypoints(conn: sqlite3.Connection, edition: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT f1.entity_key,
               CAST(f1.value AS REAL),
               CAST(f2.value AS REAL)
          FROM facts f1
          JOIN facts f2 ON f1.edition=f2.edition AND f1.entity_type=f2.entity_type
                       AND f1.entity_key=f2.entity_key
         WHERE f1.edition='%s' AND f1.entity_type='waypoint'
           AND f1.field='latitude' AND f2.field='longitude'
        """ % edition
    ).fetchall()
    return [{"key": r[0], "lat": r[1], "lon": r[2]} for r in rows if r[1] and r[2]]


def load_navaids(conn: sqlite3.Connection, edition: str) -> list[dict]:
    rows = conn.execute(
        """
        SELECT f1.entity_key,
               CAST(f1.value AS REAL),
               CAST(f2.value AS REAL)
          FROM facts f1
          JOIN facts f2 ON f1.edition=f2.edition AND f1.entity_type=f2.entity_type
                       AND f1.entity_key=f2.entity_key
         WHERE f1.edition=? AND f1.entity_type='navaid'
           AND f1.field='latitude' AND f2.field='longitude'
        """,
        (edition,),
    ).fetchall()
    result = []
    for key, lat, lon in rows:
        if lat is None or lon is None:
            continue
        fields = {
            row[0]: row[1]
            for row in conn.execute(
                "SELECT field, value FROM facts WHERE edition=? AND entity_type='navaid' AND entity_key=?",
                (edition, key),
            )
        }
        result.append({"key": key, "lat": lat, "lon": lon, **fields})
    return result


def load_runways(conn: sqlite3.Connection, edition: str, icao: str) -> list[dict]:
    keys = conn.execute(
        "SELECT DISTINCT entity_key FROM facts WHERE edition=? AND entity_type='runway' AND entity_key LIKE ?",
        (edition, f"{icao}/%"),
    ).fetchall()
    result = []
    for (key,) in keys:
        fields = {
            row[0]: row[1]
            for row in conn.execute(
                "SELECT field, value FROM facts WHERE edition=? AND entity_type='runway' AND entity_key=?",
                (edition, key),
            )
        }
        result.append({"key": key, "desig": key.split("/", 1)[1], **fields})
    return result


def _ad_popup(ad: dict, runways: list[dict]) -> str:
    icao = ad["icao"]
    rwy_list = ", ".join(r["desig"] for r in runways) or "—"
    elev = ad.get("elevation", "—")
    elev_str = f"{elev} FT" if elev != "—" else "—"
    hours = ad.get("hours_operator", ad.get("hours_ats", "—"))
    mag = ad.get("magnetic_variation", "—")
    mag_str = f"{mag}° ({ad.get('magnetic_variation_year','')})" if mag != "—" else "—"
    op = ad.get("operator_name", "—")
    rffs = ad.get("rffs_category_text", "—")

    rwy_rows = ""
    for r in runways:
        tora = r.get("tora", "—")
        lda  = r.get("lda",  "—")
        rwy_rows += f"<tr><td><b>{r['desig']}</b></td><td>{tora} M</td><td>{lda} M</td></tr>"

    return f"""
<div style="font-family:Arial,sans-serif;min-width:280px;max-width:360px">
  <h3 style="margin:0 0 6px;color:#d7263d">{icao}</h3>
  <table style="width:100%;border-collapse:collapse;font-size:13px">
    <tr><td style="color:#666;width:48%">Elevation</td><td><b>{elev_str}</b></td></tr>
    <tr><td style="color:#666">Mag Var</td><td><b>{mag_str}</b></td></tr>
    <tr><td style="color:#666">Operating hours</td><td><b>{hours}</b></td></tr>
    <tr><td style="color:#666">RFFS</td><td><b>{rffs}</b></td></tr>
    <tr><td style="color:#666">Operator</td><td><b>{op}</b></td></tr>
    <tr><td style="color:#666">Runways</td><td><b>{rwy_list}</b></td></tr>
  </table>
  {"<br><b>Declared distances:</b><table style='width:100%;font-size:12px'><tr><th>RWY</th><th>TORA</th><th>LDA</th></tr>" + rwy_rows + "</table>" if rwy_rows else ""}
  <br>
  <span style="color:#999;font-size:11px">Source: Belgium eAIP | Edition: {ad.get('section','').split()[0] if ad.get('section') else ''}</span>
</div>
"""


def _waypoint_popup(wp: dict) -> str:
    routes_enr = wp.get("routes_enr_3_2", "—")
    routes_other = wp.get("routes_other", "—")
    return f"""
<div style="font-family:Arial,sans-serif;font-size:13px">
  <b>Waypoint: {wp['key']}</b><br>
  Lat: {wp['lat']:.6f}° N<br>
  Lon: {wp['lon']:.6f}° E<br>
  ATS routes (ENR 3.2): {routes_enr or '—'}<br>
  Other routes: {routes_other or '—'}<br>
  <span style="color:#999;font-size:11px">Source: Belgium AIP ENR 4.4</span>
</div>
"""


def _navaid_popup(n: dict) -> str:
    nav_type = n.get("type", n.get("ils_system", "?"))
    freq = n.get("frequency", "—")
    freq_unit = n.get("frequency_unit", "")  # stored separately?
    identifier = n.get("identifier", n["key"])
    name = n.get("name", identifier)
    hours = n.get("hours", "—")
    return f"""
<div style="font-family:Arial,sans-serif;font-size:13px">
  <b>{name} ({identifier})</b><br>
  Type: {nav_type}<br>
  Frequency: {freq} MHZ<br>
  Hours: {hours}<br>
  Lat: {n['lat']:.6f}° N<br>
  Lon: {n['lon']:.6f}° E<br>
  <span style="color:#999;font-size:11px">Source: Belgium AIP ENR 4.1</span>
</div>
"""


def _navaid_colour(n: dict) -> str:
    nav_type = (n.get("type") or n.get("key") or "").upper()
    if "ILS" in nav_type or "LOC" in nav_type:
        return COLOURS["navaid_ils"]
    if "VOR" in nav_type or "DVOR" in nav_type:
        return COLOURS["navaid_vor"]
    if "NDB" in nav_type:
        return COLOURS["navaid_ndb"]
    return COLOURS["navaid_other"]


def load_routes(conn: sqlite3.Connection, edition: str) -> list[dict]:
    """Load route segments and associate them with waypoint/navaid coordinates."""
    # 1. Coordinate lookup: ident -> (lat, lon)
    coords: dict[str, tuple[float, float]] = {}

    # Waypoint coordinates
    for r in conn.execute(
        "SELECT f1.entity_key, CAST(f1.value AS REAL), CAST(f2.value AS REAL) "
        "FROM facts f1 JOIN facts f2 ON f1.edition=f2.edition AND f1.entity_key=f2.entity_key "
        "WHERE f1.edition=? AND f1.entity_type='waypoint' AND f1.field='latitude' AND f2.field='longitude'",
        (edition,)
    ):
        coords[r[0]] = (r[1], r[2])

    # Navaid identifier coordinates (e.g. VORs along routes)
    for r in conn.execute(
        "SELECT f1.value, CAST(f2.value AS REAL), CAST(f3.value AS REAL) "
        "FROM facts f1 "
        "JOIN facts f2 ON f1.edition=f2.edition AND f1.entity_key=f2.entity_key AND f2.field='latitude' "
        "JOIN facts f3 ON f1.edition=f3.edition AND f1.entity_key=f3.entity_key AND f3.field='longitude' "
        "WHERE f1.edition=? AND f1.entity_type='navaid' AND f1.field='identifier'",
        (edition,)
    ):
        if r[0] and r[1] and r[2]:
            coords[r[0]] = (r[1], r[2])

    # 2. Segments
    segments = []
    seg_keys = conn.execute(
        "SELECT DISTINCT entity_key FROM facts WHERE edition=? AND entity_type='route_segment'",
        (edition,)
    ).fetchall()

    for (skey,) in seg_keys:
        sdata = dict(conn.execute(
            "SELECT field, value FROM facts WHERE edition=? AND entity_type='route_segment' AND entity_key=?",
            (edition, skey)
        ).fetchall())
        from_p = sdata.get("from_point")
        to_p = sdata.get("to_point")
        if from_p in coords and to_p in coords:
            c1 = coords[from_p]
            c2 = coords[to_p]
            segments.append({
                "route": sdata.get("route", skey.split("/")[0]),
                "from": from_p,
                "to": to_p,
                "dist": sdata.get("distance"),
                "coords": [[c1[0], c1[1]], [c2[0], c2[1]]],
            })
    return segments


def build_map(db_path: str, edition: str) -> folium.Map:
    conn = sqlite3.connect(db_path)

    # Centre on Belgium
    m = folium.Map(
        location=[50.5, 4.5],
        zoom_start=8,
        tiles="OpenStreetMap",
    )

    # ── Layer groups ──────────────────────────────────────────────────────────
    lg_airports_target  = folium.FeatureGroup(name="Airports (EBBR / EBLG / EBCI)", show=True)
    lg_airports_other   = folium.FeatureGroup(name="All other aerodromes",           show=True)
    lg_routes           = folium.FeatureGroup(name="ATS Routes / Airways (ENR 3.2)", show=True)
    lg_navaids          = folium.FeatureGroup(name="Navaids (ENR 4.1)",              show=True)
    lg_waypoints        = plugins.MarkerCluster(name="Waypoints (ENR 4.4)",           show=False)

    # ── Aerodromes ────────────────────────────────────────────────────────────
    aerodromes = load_aerodromes(conn, edition)
    for ad in aerodromes:
        icao = ad["icao"]
        is_target = icao in TARGET_AIRPORTS
        runways = load_runways(conn, edition, icao)

        colour = COLOURS["target_airport"] if is_target else COLOURS["other_airport"]
        radius = 12 if is_target else 6
        popup_html = _ad_popup(ad, runways)

        marker = folium.CircleMarker(
            location=[ad["lat"], ad["lon"]],
            radius=radius,
            color=colour,
            fill=True,
            fill_color=colour,
            fill_opacity=0.85,
            weight=2,
            popup=folium.Popup(popup_html, max_width=400),
            tooltip=folium.Tooltip(icao, permanent=is_target),
        )
        if is_target:
            marker.add_to(lg_airports_target)
        else:
            marker.add_to(lg_airports_other)

    # ── Waypoints ─────────────────────────────────────────────────────────────
    waypoints = load_waypoints(conn, edition)
    for wp in waypoints:
        folium.CircleMarker(
            location=[wp["lat"], wp["lon"]],
            radius=3,
            color=COLOURS["waypoint"],
            fill=True,
            fill_color=COLOURS["waypoint"],
            fill_opacity=0.7,
            weight=1,
            popup=folium.Popup(_waypoint_popup(wp), max_width=300),
            tooltip=folium.Tooltip(wp["key"]),
        ).add_to(lg_waypoints)

    # ── ATS Routes / Airways ──────────────────────────────────────────────────
    routes = load_routes(conn, edition)
    for seg in routes:
        dist_str = f"{seg['dist']} NM" if seg["dist"] else ""
        popup_txt = f"<b>Route {seg['route']}</b><br>{seg['from']} &rarr; {seg['to']}<br>{dist_str}"
        folium.PolyLine(
            locations=seg["coords"],
            color="#f57c00",
            weight=2.5,
            opacity=0.75,
            popup=folium.Popup(popup_txt, max_width=250),
            tooltip=folium.Tooltip(f"Route {seg['route']}: {seg['from']} &rarr; {seg['to']}"),
        ).add_to(lg_routes)

    # ── Navaids ───────────────────────────────────────────────────────────────
    navaids = load_navaids(conn, edition)
    for n in navaids:
        colour = _navaid_colour(n)
        folium.RegularPolygonMarker(
            location=[n["lat"], n["lon"]],
            number_of_sides=3,
            radius=8,
            color=colour,
            fill_color=colour,
            fill_opacity=0.9,
            popup=folium.Popup(_navaid_popup(n), max_width=300),
            tooltip=folium.Tooltip(n.get("identifier", n["key"])),
        ).add_to(lg_navaids)

    # ── Add layers + control ──────────────────────────────────────────────────
    lg_airports_target.add_to(m)
    lg_airports_other.add_to(m)
    lg_routes.add_to(m)
    lg_navaids.add_to(m)
    lg_waypoints.add_to(m)
    folium.LayerControl(collapsed=False).add_to(m)

    # ── Legend ────────────────────────────────────────────────────────────────
    legend_html = """
<div style="position:fixed;bottom:30px;left:30px;z-index:1000;background:white;
            padding:12px 16px;border-radius:6px;box-shadow:2px 2px 8px rgba(0,0,0,0.25);
            font-family:Arial,sans-serif;font-size:13px;line-height:1.8">
  <b style="font-size:14px">Legend</b><br>
  <span style="color:#d7263d">&#11044;</span> EBBR / EBLG / EBCI<br>
  <span style="color:#1b4332">&#11044;</span> Other aerodromes<br>
  <span style="color:#f57c00">&#9644;&#9644;</span> ATS Routes / Airways<br>
  <span style="color:#7b1fa2">&#9650;</span> VOR / DVOR<br>
  <span style="color:#e65100">&#9650;</span> ILS / LOC<br>
  <span style="color:#00695c">&#9650;</span> NDB<br>
  <span style="color:#1565c0">&#11044;</span> Waypoints<br>
  <br>
  <span style="color:#999;font-size:11px">Belgium &amp; Luxembourg eAIP<br>
  Edition: {edition}<br>Source: skeyes</span>
</div>
""".format(edition=edition)
    m.get_root().html.add_child(folium.Element(legend_html))

    conn.close()
    return m


def main() -> None:
    ap = argparse.ArgumentParser(description="Generate interactive aerodrome map")
    ap.add_argument("--db",      default="data/aip.db")
    ap.add_argument("--edition", default="2026-10-01")
    ap.add_argument("--output",  default="analysis/aerodrome_map.html")
    ap.add_argument("--no-open", action="store_true",
                    help="Don't open the map in a browser automatically")
    args = ap.parse_args()

    Path(args.output).parent.mkdir(parents=True, exist_ok=True)

    print(f"Building map for edition {args.edition}...")
    m = build_map(args.db, args.edition)
    m.save(args.output)
    print(f"Saved: {Path(args.output).resolve()}")

    if not args.no_open:
        webbrowser.open(Path(args.output).resolve().as_uri())


if __name__ == "__main__":
    main()
