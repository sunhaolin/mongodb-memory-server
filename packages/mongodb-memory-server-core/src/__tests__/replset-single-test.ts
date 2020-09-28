import MongoMemoryReplSet from '../MongoMemoryReplSet';
import { MongoClient } from 'mongodb';

jasmine.DEFAULT_TIMEOUT_INTERVAL = 600000;

describe('single server replset', () => {
  it('should enter running state', async () => {
    const replSet = new MongoMemoryReplSet();
    await replSet.waitUntilRunning();
    const uri = await replSet.getUri();
    expect(uri.split(',').length).toEqual(1);

    await replSet.stop();
  });

  it('should be able to get connection string to specific db', async () => {
    const replSet = new MongoMemoryReplSet({});
    await replSet.waitUntilRunning();
    const uri = await replSet.getUri('other');
    expect(uri.split(',').length).toEqual(1);
    expect(uri.includes('/other')).toBeTruthy();
    expect(uri.includes('replicaSet=testset')).toBeTruthy();

    await replSet.stop();
  });

  it('should be able to get dbName', async () => {
    const opts: any = { autoStart: false, replSet: { dbName: 'static' } };
    const replSet = new MongoMemoryReplSet(opts);
    const dbName = replSet.getDbName();
    expect(dbName).toEqual('static');

    await replSet.stop();
  });

  it('should not autostart if autostart: false', async () => {
    const replSet = new MongoMemoryReplSet({ autoStart: false });
    await new Promise((resolve, reject) => {
      replSet.once('state', (state) => reject(new Error(`Invalid state: ${state}`)));
      setTimeout(resolve, 500);
    });

    await replSet.stop();
  });

  it('should be possible to connect replicaset after waitUntilRunning resolves', async () => {
    const replSet = new MongoMemoryReplSet();
    await replSet.waitUntilRunning();
    const uri = await replSet.getUri();

    const con = await MongoClient.connect(`${uri}?replicaSet=testset`, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await con.close();
    await replSet.stop();
  });

  it('"new" should throw an error if replSet count is 0 or less', () => {
    try {
      new MongoMemoryReplSet({ replSet: { count: 0 } });
      fail('Expected "new MongoMemoryReplSet" to throw an error');
    } catch (err) {
      expect(err.message).toEqual('ReplSet Count needs to be 1 or higher!');
    }
  });

  it('"waitUntilRunning" should throw an error if _state is not "init"', async () => {
    const replSet = new MongoMemoryReplSet({ autoStart: false });
    const timeout = setTimeout(() => {
      fail('Timeout - Expected "waitUntilRunning" to throw');
    }, 100);

    try {
      await replSet.waitUntilRunning();
      fail('Expected "waitUntilRunning" to throw');
    } catch (err) {
      clearTimeout(timeout);
      expect(err.message).toEqual(
        'State is not "running" or "init" - cannot wait on something that dosnt start'
      );
    }
  });

  it('"getUri" should throw an error if _state is not "running"', async () => {
    const replSet = new MongoMemoryReplSet({ autoStart: false });
    const timeout = setTimeout(() => {
      fail('Timeout - Expected "getUri" to throw');
    }, 100);

    try {
      await replSet.getUri();
      fail('Expected "getUri" to throw');
    } catch (err) {
      clearTimeout(timeout);
      expect(err.message).toEqual('Replica Set is not running. Use debug for more info.');
    }
  });
});
