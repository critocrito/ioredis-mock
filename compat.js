/*
 * Steps to run:
 *   $ vagrant up        # builds a vagrant vm with redis-5.0-rc3
 *   $ yarn test-compat  # or npm run test-compat
 */
import expect from 'expect';

import Redis from 'ioredis';
import MockRedis from './src';

const { string: xadd } = Redis.prototype.createBuiltinCommand('xadd');
const { string: xread } = Redis.prototype.createBuiltinCommand('xread');
Redis.prototype.xadd = xadd;
Redis.prototype.xread = xread;

describe('compat', () => {
  it('should block reads until data becomes available', () => {
    const redis = new Redis();
    const redisMock = new MockRedis();

    const op = redis
      .xread('BLOCK', '0', 'STREAMS', 'mystream', '$')
      .then(result => {
        console.log('redis xread returned call');
        return result;
      });
    const opMock = redisMock
      .xread('BLOCK', '0', 'STREAMS', 'mystream', '$')
      .then(result => {
        console.log('redisMock xread returned call');
        return result;
      });

    return Promise.all([
      redis.xadd('mystream', '*', 'sensor-id', '1234', 'temperature', '19.8'),
      redisMock.xadd(
        'mystream',
        '*',
        'sensor-id',
        '1234',
        'temperature',
        '19.8'
      ),
    ])
      .then(([id, idMock]) => {
        console.log('all events added to stream');
        expect(typeof id).toBe('string');
        expect(typeof idMock).toBe('string');
        expect(id.split('-').length).toBe(2);
        expect(idMock.split('-').length).toBe(2);

        return Promise.all([op, opMock]);
      })
      .then(([result, resultMock]) => {
        console.log('all blocked read calls returned');
        const [[stream, [[id, obj]]]] = result;
        const [[streamMock, [[idMock, objMock]]]] = resultMock;
        expect(stream).toEqual(streamMock);
        expect(obj).toEqual(objMock);
      });
  });
});
