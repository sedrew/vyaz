/**
 * Simple YAML serializer (no external dependency).
 */

function yamlValue(val: unknown, indent: string): string {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') {
    if (/[:\n#{}[\],&*?|>!%@`"' ]/.test(val) || val === '') {
      return JSON.stringify(val);
    }
    return val;
  }
  if (typeof val === 'number') return String(val);
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) {
    if (val.length === 0) return '[]';
    const lines: string[] = [];
    for (const item of val) {
      if (typeof item === 'object' && item !== null) {
        lines.push('- ' + yamlObject(item as Record<string, unknown>, indent + '  ').trimStart());
      } else {
        lines.push('- ' + yamlValue(item, indent + '  '));
      }
    }
    return lines.join('\n' + indent);
  }
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>);
    if (keys.length === 0) return '{}';
    return yamlObject(val as Record<string, unknown>, indent);
  }
  return String(val);
}

function yamlObject(obj: Record<string, unknown>, indent: string): string {
  const lines: string[] = [];
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === undefined) continue;
    const prefix = indent + key + ':';
    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
      lines.push(prefix);
      lines.push(yamlObject(val as Record<string, unknown>, indent + '  '));
    } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
      lines.push(prefix);
      for (const item of val) {
        lines.push(indent + '  - ' + yamlObject(item as Record<string, unknown>, indent + '    ').trimStart());
      }
    } else {
      lines.push(prefix + ' ' + yamlValue(val, indent + '  '));
    }
  }
  return lines.join('\n');
}

export function toYaml(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) return yamlValue(obj, '');
  if (Array.isArray(obj)) return yamlValue(obj, '');
  return yamlObject(obj as Record<string, unknown>, '');
}