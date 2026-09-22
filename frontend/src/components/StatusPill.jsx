export default function StatusPill({ status = 'unknown' }) {
  const label = status === 'detected' ? 'Detected' : status === 'likely' ? 'Likely' : status === 'potential' ? 'Potential' : 'Unknown';
  return <span className={`status-pill status-${status}`}>{label}</span>;
}
