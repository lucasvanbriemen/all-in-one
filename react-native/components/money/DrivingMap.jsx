import React, {useMemo, useState} from 'react';
import {Image, StyleSheet, Text, View} from 'react-native';
import Svg, {Circle, Line} from 'react-native-svg';
import secrets from '../secerts.json';

// Points closer than this (in degrees, ~300 m) count as the same spot, so GPS
// paths of the same road from different trips land on the same segments.
const GRID = 0.003;
const TILE = 256;
const MAX_ZOOM = 15;
const HEIGHT = 360;
const PADDING = 24;

// MapTiler's streets map (OpenStreetMap data); the key lives in secerts.json.
const tileUrl = (tile, scheme) =>
  `https://api.maptiler.com/maps/${scheme === 'dark' ? 'streets-v2-dark' : 'streets-v2'}/256/${tile.z}/${tile.x}/${tile.y}@2x.png?key=${secrets.MAPTILER_API_KEY}`;

const snap = value => Math.round(value / GRID) * GRID;
const key = point => `${snap(point.lat).toFixed(3)},${snap(point.lng).toFixed(3)}`;

// Every road segment driven, with how many trips used it. Trips without a GPS
// path fall back to a straight line from start to end (drawn dashed).
function buildSegments(trips) {
  const segments = new Map();

  trips.forEach((trip, index) => {
    const exact = trip.path?.length > 1;
    const points = exact ? trip.path : [trip.from, trip.to].filter(Boolean);

    for (let i = 1; i < points.length; i++) {
      const a = key(points[i - 1]);
      const b = key(points[i]);
      if (a === b) continue;

      const id = a < b ? `${a}|${b}` : `${b}|${a}`;
      const segment = segments.get(id) ?? {id, from: points[i - 1], to: points[i], trips: new Set(), exact};
      segment.trips.add(index);
      segments.set(id, segment);
    }
  });

  return [...segments.values()].map(segment => ({...segment, count: segment.trips.size}));
}

// Web Mercator, the projection map tiles use, in pixels at a (fractional) zoom.
const worldX = (lng, zoom) => ((lng + 180) / 360) * TILE * 2 ** zoom;
const worldY = (lat, zoom) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * TILE * 2 ** zoom;
};

// Fits the driven area into width × height and lists the tiles underneath it.
function project(segments, width, height) {
  const points = segments.flatMap(s => [s.from, s.to]);
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  const [minLat, maxLat, minLng, maxLng] = [Math.min(...lats), Math.max(...lats), Math.min(...lngs), Math.max(...lngs)];

  // Size of the area at zoom 0, then the zoom where it just fits.
  const spanX = Math.max(worldX(maxLng, 0) - worldX(minLng, 0), 1e-6);
  const spanY = Math.max(worldY(minLat, 0) - worldY(maxLat, 0), 1e-6);
  const fit = Math.min((width - PADDING * 2) / spanX, (height - PADDING * 2) / spanY);
  const zoom = Math.min(Math.log2(fit), MAX_ZOOM);

  const tileZoom = Math.floor(zoom);
  const tileSize = TILE * 2 ** (zoom - tileZoom);
  const left = (worldX(minLng, zoom) + worldX(maxLng, zoom)) / 2 - width / 2;
  const top = (worldY(minLat, zoom) + worldY(maxLat, zoom)) / 2 - height / 2;

  const tiles = [];
  const count = 2 ** tileZoom;
  for (let x = Math.floor(left / tileSize); x <= Math.floor((left + width) / tileSize); x++) {
    for (let y = Math.max(0, Math.floor(top / tileSize)); y <= Math.min(count - 1, Math.floor((top + height) / tileSize)); y++) {
      tiles.push({key: `${tileZoom}/${x}/${y}`, x: ((x % count) + count) % count, y, z: tileZoom, left: x * tileSize - left, top: y * tileSize - top, size: tileSize});
    }
  }

  return {tiles, xy: point => ({x: worldX(point.lng, zoom) - left, y: worldY(point.lat, zoom) - top})};
}

export function DrivingMap({trips}) {
  const styles = createStyles();
  const [selected, setSelected] = useState(null);
  const [width, setWidth] = useState(0);

  const segments = useMemo(() => buildSegments(trips).sort((a, b) => a.count - b.count), [trips]);
  if (segments.length === 0) return null;

  const max = Math.max(...segments.map(s => s.count));
  const {tiles, xy} = project(segments, width || 1, HEIGHT);
  const ends = trips.flatMap(trip => [trip.from, trip.to]).filter(Boolean);
  const strength = count => (max === 1 ? 1 : (count - 1) / (max - 1));
  const opacity = t => 0.4 + 0.6 * t;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Roads</Text>
      <View style={styles.map} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <>
            {tiles.map(tile => (
              <Image
                key={tile.key}
                source={{uri: tileUrl(tile, colors.scheme)}}
                style={{position: 'absolute', left: tile.left, top: tile.top, width: tile.size, height: tile.size}}
              />
            ))}
            <Svg width={width} height={HEIGHT} style={StyleSheet.absoluteFill}>
              {segments.map(segment => {
                const a = xy(segment.from);
                const b = xy(segment.to);
                const t = strength(segment.count);
                const active = selected?.id === segment.id;

                return (
                  <React.Fragment key={segment.id}>
                    <Line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke={colors.primary}
                      strokeOpacity={active ? 1 : opacity(t)}
                      strokeWidth={active ? 7 : 2 + 4 * t}
                      strokeLinecap="round"
                      strokeDasharray={segment.exact ? undefined : '4 6'}
                    />
                    {/* Wider invisible line so the thin ones are easy to hit. */}
                    <Line
                      x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                      stroke="transparent"
                      strokeWidth={16}
                      onPress={() => setSelected(active ? null : segment)}
                    />
                  </React.Fragment>
                );
              })}
              {ends.map((point, index) => {
                const {x, y} = xy(point);
                return <Circle key={index} cx={x} cy={y} r={3} fill={colors.onSurface} fillOpacity={0.5} />;
              })}
            </Svg>
          </>
        ) : null}
        <Text style={styles.attribution}>© MapTiler © OpenStreetMap contributors</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.caption}>
          {selected
            ? `Driven ${selected.count}× in this period${selected.exact ? '' : ' (start to end only, no route)'}`
            : 'Tap a road to see how often you drove it'}
        </Text>
        <View style={styles.legend}>
          <Text style={styles.caption}>1×</Text>
          {[0, 0.33, 0.66, 1].map(t => (
            <View key={t} style={[styles.swatch, {backgroundColor: colors.primary, opacity: opacity(t), height: 2 + 4 * t}]} />
          ))}
          <Text style={styles.caption}>{max}×</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = colors => StyleSheet.create({
  card: {...surfaceStyle(colors), padding: 16, borderRadius: 16},
  cardTitle: {fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: colors.onSurface},
  map: {height: HEIGHT, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surface},
  attribution: {position: 'absolute', right: 6, bottom: 4, fontSize: 10, color: colors.onSurfaceVariant, opacity: 0.8},
  footer: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8, flexWrap: 'wrap'},
  caption: {fontSize: 13, color: colors.onSurfaceVariant},
  legend: {flexDirection: 'row', alignItems: 'center', gap: 4},
  swatch: {width: 18, borderRadius: 2},
});
