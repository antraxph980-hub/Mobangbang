const crypto = require('crypto');
const SdpStruct = require('./sdp-struct');
const Zstd = require('./zstd');

class GameConn {
  static LOGIN_HOST = 'global-login.ml.youngjoygame.com';
  static LOGIN_PORT = 30021;
  static AES_KEY = Buffer.from('f5a193d50ade553e9835595f5cd75ddd', 'hex');
  static AES_IV = Buffer.alloc(16, 0);

  constructor(deviceId) {
    this.deviceId = deviceId;
    this.channel = 'and_usa';
    this.clientVersion = '2.1.99.1205.1';
    this.accountId = 0;
    this.sessionKey = '';
    this.zoneId = 0;
    this.gameServerHost = '';
    this.gameServerPort = 0;
    this.sequence = 1;
    this.socket = null;
    this.lastCmd = 0;
    this.lastBody = null;
    this.queue = Buffer.alloc(0);
  }

  async loginToLoginServer() {
    // Web environment - simulated connection
    this.accountId = Math.floor(Math.random() * 1000000000);
    this.sessionKey = 'mock_session_' + Date.now() + '_' + crypto.randomBytes(8).toString('hex');
    this.zoneId = 1;
    return true;
  }

  async getGameServer() {
    this.gameServerHost = 'global-game.ml.youngjoygame.com';
    this.gameServerPort = 30001;
    return true;
  }

  async connectToGameServer() {
    return true;
  }

  async getAccountInfo(guid, session) {
    const info = new SdpStruct();
    const now = Math.floor(Date.now() / 1000);
    
    info.put(0, parseInt(guid) || 0);
    info.put(1, this.zoneId);
    info.put(2, 'TestPlayer_' + crypto.randomBytes(4).toString('hex'));
    info.put(3, Math.floor(Math.random() * 30) + 10);
    info.put(5, now - Math.floor(Math.random() * 86400 * 30));
    info.put(7, Math.floor(Math.random() * 10000));
    info.put(8, Math.floor(Math.random() * 200) + 50);
    info.put(83, Math.floor(Math.random() * 500) + 50);
    info.put(87, 'PH');
    info.put(97, 'PH');
    info.put(95, Math.floor(Math.random() * 200) + 50);
    info.build();
    return info;
  }

  async getRoleInfo(guid, session) {
    const info = new SdpStruct();
    info.put(9, Math.floor(Math.random() * 60) + 20);
    info.put(22, Math.floor(Math.random() * 5000) + 100);
    info.build();
    return info;
  }

  close() {
    // Clean up
  }

  accountId() { return this.accountId; }
  sessionKey() { return this.sessionKey; }
  zoneId() { return this.zoneId; }
  gameServerHost() { return this.gameServerHost; }
  gameServerPort() { return this.gameServerPort; }
}

module.exports = GameConn;