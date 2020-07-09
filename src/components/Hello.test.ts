import { Hello } from './Hello';

describe('Hello', () => {
  it('should succeed', async () => {
    expect(Hello()).toEqual('world');
  });
});
