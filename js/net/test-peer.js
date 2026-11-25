/**
 * A BroadcastChannel stand-in for PeerJS used by the automated tests (window.__BC). Not used in real games.
 */
// PeerJS when available; BroadcastChannel stand-in for local testing (window.__BC)
class BCConn {
  constructor(p, r, cid) {
    this.p = p;
    this.peer = r;
    this.cid = cid;
    this.h = {};
    this.open = false;
  }
  on(e, f) {
    this.h[e] = f;
  }
  _e(e, ...a) {
    this.h[e] && this.h[e](...a);
  }
  send(d) {
    if (this.p.dead || !this.open) return;
    this.p.ch.postMessage({ t: 'd', cid: this.cid, to: this.peer, data: d });
  }
  close() {
    if (!this.open) return;
    this.open = false;
    if (!this.p.dead) this.p.ch.postMessage({ t: 'x', cid: this.cid, to: this.peer });
    setTimeout(() => this._e('close'), 0);
  }
}

export class BCPeer {
  constructor(id) {
    this.id = id || 'p' + Math.random().toString(36).slice(2, 8);
    this.ch = new BroadcastChannel('pffbc');
    this.h = {};
    this.conns = {};
    this.taken = false;
    this.ch.onmessage = (e) => this._m(e.data);
    if (id) {
      this.ch.postMessage({ t: 'probe', to: id });
      setTimeout(() => {
        if (this.taken) {
          this.dead = true;
          this._e('error', { type: 'unavailable-id' });
        } else this._e('open', this.id);
      }, 1500);
    } else setTimeout(() => this._e('open', this.id), 20);
  }
  on(e, f) {
    this.h[e] = f;
  }
  _e(e, ...a) {
    this.h[e] && this.h[e](...a);
  }
  connect(rid) {
    const cid = Math.random().toString(36).slice(2);
    const c = new BCConn(this, rid, cid);
    this.conns[cid] = c;
    this.ch.postMessage({ t: 'c', from: this.id, to: rid, cid });
    return c;
  }
  _m(m) {
    if (m.t === 'taken') {
      if (m.to === this.id) this.taken = true;
      return;
    }
    if (this.dead || m.to !== this.id) return;
    if (m.t === 'probe') {
      this.ch.postMessage({ t: 'taken', to: this.id });
      return;
    }
    const c = this.conns[m.cid];
    if (m.t === 'c') {
      const n = new BCConn(this, m.from, m.cid);
      n.open = true;
      this.conns[m.cid] = n;
      this._e('connection', n);
      this.ch.postMessage({ t: 'a', to: m.from, cid: m.cid });
      setTimeout(() => n._e('open'), 5);
    } else if (m.t === 'a') {
      if (c) {
        c.open = true;
        c._e('open');
      }
    } else if (m.t === 'd') {
      if (c && c.open) c._e('data', m.data);
    } else if (m.t === 'x') {
      if (c && c.open) {
        c.open = false;
        c._e('close');
      }
    }
  }
  get disconnected() {
    return false;
  }
  reconnect() {}
  destroy() {
    for (const c of Object.values(this.conns)) c.close();
    this.dead = true;
    setTimeout(() => this.ch.close(), 50);
  }
}
