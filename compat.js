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
  it('should add and read values from redis', () => {
    const redis = new Redis();
    const redisMock = new MockRedis();

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
        expect(typeof id).toBe('string');
        expect(typeof idMock).toBe('string');
        expect(id.split('-').length).toBe(2);
        expect(idMock.split('-').length).toBe(2);

        return Promise.all([
          redis.xread('COUNT', '1', 'STREAMS', 'mystream', '0'),
          redisMock.xread('COUNT', '1', 'STREAMS', 'mystream', '0'),
        ]);
      })
      .then(([result, resultMock]) => {
        const [[stream, [[id, obj]]]] = result;
        const [[streamMock, [[idMock, objMock]]]] = resultMock;
        expect(stream).toEqual(streamMock);
        expect(obj).toEqual(objMock);
      });
  });

  it('should add and read values from redis since ID', () => {
    const redis = new Redis();
    const redisMock = new MockRedis();

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

      redis.xadd('mystream', '*', 'sensor-id', '4321', 'temperature', '18.9'),
      redisMock.xadd(
        'mystream',
        '*',
        'sensor-id',
        '4321',
        'temperature',
        '18.9'
      ),

      redis.xadd('mystream', '*', 'sensor-id', '1423', 'temperature', '28.9'),
      redisMock.xadd(
        'mystream',
        '*',
        'sensor-id',
        '1423',
        'temperature',
        '28.9'
      ),

      redis.xadd('mystream', '*', 'sensor-id', '2314', 'temperature', '19.89'),
      redisMock.xadd(
        'mystream',
        '*',
        'sensor-id',
        '2314',
        'temperature',
        '19.89'
      ),
    ])
      .then(results => {
        console.warn('IDs of xadd since ID');
        console.dir(results, {
          depth: null,
          colors: true,
        });

        const [
          idA,
          idMockA,
          idB,
          idMockB,
          idC,
          idMockC,
          idD,
          idMockD,
        ] = results;

        results.forEach(id => {
          expect(typeof id).toBe('string');
          expect(id.split('-').length).toBe(2);
        });

        return Promise.all([
          redis.xread('STREAMS', 'mystream', idB),
          redisMock.xread('STREAMS', 'mystream', idMockB),
          redis.xread('COUNT', '2', 'STREAMS', 'mystream', idB),
          redisMock.xread('COUNT', '2', 'STREAMS', 'mystream', idMockB),
        ]);
      })
      .then(([result, resultMock, resultTwo, resultTwoMock]) => {
        console.warn('results since ID');
        console.dir(result, { depth: null, colors: true });
        console.warn('results since ID mock');
        console.dir(resultMock, { depth: null, colors: true });

        console.warn('resultsTwo since ID');
        console.dir(result, { depth: null, colors: true });
        console.warn('resultsTwo since ID mock');
        console.dir(resultTwoMock, { depth: null, colors: true });

        const [[stream, events]] = result;
        const [[streamMock, eventsMock]] = resultMock;
        const objs = events.map(e => e[1]);
        const objsMock = eventsMock.map(e => e[1]);

        const [[streamTwo, eventsTwo]] = resultTwo;
        const [[streamTwoMock, eventsTwoMock]] = resultTwoMock;
        const objsTwo = eventsTwo.map(e => e[1]);
        const objsTwoMock = eventsTwoMock.map(e => e[1]);

        expect(result.length).toEqual(resultMock.length);
        expect(stream).toEqual(streamMock);
        expect(objs).toEqual(objsMock);

        expect(resultTwo.length).toEqual(resultTwoMock.length);
        expect(streamTwo).toEqual(streamTwoMock);
        expect(objsTwo).toEqual(objsTwoMock);
      });
  });

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
