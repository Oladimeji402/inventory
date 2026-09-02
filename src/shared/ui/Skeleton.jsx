export default function Skeleton({ width = '100%', height = 14, radius, style = {} }) {
  return (
    <span
      className="mx-skeleton"
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
    />
  );
}
