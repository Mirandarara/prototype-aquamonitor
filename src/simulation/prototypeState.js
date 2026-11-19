// Unknown telemetry must never look like a confirmed off command.
export function prototypeState(v) {
  const command = key => !v.fresh || v[key] === 'unknown' ? 'unknown' : v[key] === 'on' ? 'on' : 'off';
  return {
    drain: command('drain'),
    reuse: command('reuse'),
    alert: !v.fresh ? 'unknown' : v.alarm || v.sensor === false ? 'on' : 'off',
    sensor: !v.fresh || v.sensor == null ? 'unknown' : v.sensor ? 'on' : 'off',
  };
}
