// http giả cho test api.ops: ghi lại mọi lời gọi và trả dữ liệu theo "VERB path".
export function fakeHttp(responses = {}) {
  const calls = [];
  return {
    calls,
    request: async (verb, path, o = {}) => {
      calls.push({ verb, path, ...o });
      const key = `${verb} ${path}`;
      if (!(key in responses)) throw Object.assign(new Error(`chưa giả lập ${key}`), { code: 'NOT_MOCKED' });
      const r = responses[key];
      if (r instanceof Error) throw r;
      return typeof r === 'function' ? r(o) : r;
    }
  };
}
