import Mock from 'mockjs';
import { defineComponent } from 'vue-demi';

import { clearGlobalOptions } from '../core/config';
import {
  FOCUS_LISTENER,
  RECONNECT_LISTENER,
  VISIBLE_LISTENER,
} from '../core/utils/listener';
import { useLoadMore } from '../index';
import { mount, waitForTime } from './utils';
import { failedRequest } from './utils/request';

type CustomPropertyMockDataType = {
  myData: {
    result: string[];
  };
};

type NormalMockDataType = {
  list: string[];
};

describe('useLoadMore', () => {
  beforeAll(() => {
    jest.useFakeTimers('modern');
  });

  // mock fetch
  const normalMockData: NormalMockDataType = Mock.mock({
    'list|10': ['@name'],
  });

  const customPropertyMockData: CustomPropertyMockDataType = {
    myData: Mock.mock({
      'result|10': ['@name'],
    }),
  };

  function generateNormalData(current: number, total = 10) {
    let list: string[] = [];
    if (current <= total) {
      list = normalMockData.list;
    } else {
      list = [];
    }
    return {
      current,
      total,
      list,
    };
  }

  type NormalAPIReturnType = ReturnType<typeof generateNormalData>;
  type rawDataType = {
    data: NormalAPIReturnType;
    dataList: NormalAPIReturnType['list'];
  };

  const normalRequest = (rawData: rawDataType) => {
    const current = (rawData?.data?.current || 0) + 1;
    return new Promise<NormalAPIReturnType>(resolve => {
      setTimeout(() => {
        resolve(generateNormalData(current));
      }, 1000);
    });
  };

  function generateCustomData(current: number, total = 10) {
    let list: string[] = [];
    if (current <= total) {
      list = customPropertyMockData.myData.result;
    } else {
      list = [];
    }
    return {
      current,
      total,
      myData: {
        result: list,
      },
    };
  }

  type CustomAPIReturnType = ReturnType<typeof generateCustomData>;
  type CustomRawDataType = {
    data: CustomAPIReturnType;
    dataList: CustomAPIReturnType['myData']['result'];
  };

  const customRequest = (rawData: CustomRawDataType) => {
    const current = (rawData?.data?.current || 0) + 1;
    return new Promise<CustomAPIReturnType>(resolve => {
      setTimeout(() => {
        resolve(generateCustomData(current));
      }, 1000);
    });
  };

  const originalError = console.error;
  beforeEach(() => {
    console.error = jest.fn();
    // clear global options
    clearGlobalOptions();

    // clear listener
    RECONNECT_LISTENER.clear();
    FOCUS_LISTENER.clear();
    VISIBLE_LISTENER.clear();
  });

  afterEach(() => {
    console.error = originalError;
  });

  test('should be defined', () => {
    expect(useLoadMore).toBeDefined();
  });

  test('useLoadMore should work', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { dataList, loadingMore, loading, noMore, loadMore } =
            useLoadMore(normalRequest, {
              isNoMore: d => (d ? d?.current >= d?.total : false),
            });
          return {
            dataList,
            loadingMore,
            loading,
            noMore,
            loadMore,
          };
        },
      }),
    );

    expect(wrapper.dataList).toHaveLength(0);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(true);
    expect(wrapper.noMore).toBe(false);

    await waitForTime(1000);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.noMore).toBe(false);

    for (let index = 1; index <= 9; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(true);
      expect(wrapper.loading).toBe(true);
      await waitForTime(1000);
      expect(wrapper.dataList).toHaveLength(10 + index * 10);
      expect(wrapper.noMore).toBe(index === 9);
    }

    for (let index = 0; index < 100; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.loading).toBe(false);
      await waitForTime(1000);
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.dataList).toHaveLength(100);
      expect(wrapper.noMore).toBe(true);
    }
  });

  test('listKey should work', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { dataList, loadingMore, loading, noMore, loadMore } =
            useLoadMore(customRequest, {
              isNoMore: d => (d ? d?.current >= d?.total : false),
              listKey: 'myData.result',
            });
          return {
            dataList,
            loadingMore,
            loading,
            noMore,
            loadMore,
          };
        },
      }),
    );

    expect(wrapper.dataList).toHaveLength(0);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(true);
    expect(wrapper.noMore).toBe(false);

    await waitForTime(1000);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.noMore).toBe(false);

    for (let index = 1; index <= 9; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(true);
      expect(wrapper.loading).toBe(true);
      await waitForTime(1000);
      expect(wrapper.dataList).toHaveLength(10 + index * 10);
      expect(wrapper.noMore).toBe(index === 9);
    }
  });

  test('reload should work', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const {
            dataList,
            loadingMore,
            noMore,
            loading,
            reloading,
            loadMore,
            reload,
          } = useLoadMore(normalRequest, {
            isNoMore: d => (d ? d?.current >= d?.total : false),
          });
          return {
            dataList,
            loadingMore,
            noMore,
            loading,
            reloading,
            loadMore,
            reload,
          };
        },
      }),
    );

    expect(wrapper.loading).toBe(true);
    await waitForTime(1000);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.reloading).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.noMore).toBe(false);

    for (let index = 1; index <= 9; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(true);
      expect(wrapper.loading).toBe(true);
      expect(wrapper.reloading).toBe(false);
      await waitForTime(1000);
      expect(wrapper.reloading).toBe(false);
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.dataList).toHaveLength(10 + index * 10);
      expect(wrapper.noMore).toBe(index === 9);
    }

    for (let index = 0; index < 100; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.reloading).toBe(false);
      await waitForTime(1000);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.reloading).toBe(false);
      expect(wrapper.dataList).toHaveLength(100);
      expect(wrapper.noMore).toBe(true);
    }

    wrapper.reload();
    expect(wrapper.loading).toBe(true);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.reloading).toBe(true);
    expect(wrapper.dataList).toHaveLength(0);
    expect(wrapper.noMore).toBe(true);
    await waitForTime(1000);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.reloading).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);

    for (let index = 1; index <= 9; index++) {
      wrapper.loadMore();
      expect(wrapper.loading).toBe(true);
      expect(wrapper.loadingMore).toBe(true);
      expect(wrapper.reloading).toBe(false);
      await waitForTime(1000);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.reloading).toBe(false);
      expect(wrapper.dataList).toHaveLength(10 + index * 10);
      expect(wrapper.noMore).toBe(index === 9);
    }
  });

  test('refresh should work, case: 1', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const {
            dataList,
            loadingMore,
            loading,
            loadMore,
            refresh,
            refreshing,
          } = useLoadMore(normalRequest);
          return {
            dataList,
            loadingMore,
            loading,
            loadMore,
            refresh,
            refreshing,
          };
        },
      }),
    );

    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(false);
    await waitForTime(1000);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);

    for (let index = 1; index <= 5; index++) {
      wrapper.loadMore();
      expect(wrapper.loadingMore).toBe(true);
      expect(wrapper.loading).toBe(true);
      expect(wrapper.refreshing).toBe(false);
      await waitForTime(1000);
      expect(wrapper.loading).toBe(false);
      expect(wrapper.loadingMore).toBe(false);
      expect(wrapper.refreshing).toBe(false);
      expect(wrapper.dataList).toHaveLength(10 + index * 10);
    }

    expect(wrapper.dataList).toHaveLength(60);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.refreshing).toBe(false);

    wrapper.refresh();
    expect(wrapper.dataList).toHaveLength(60);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(true);

    await waitForTime(1000);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.refreshing).toBe(false);
  });

  test('refresh should work, case: 2', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { dataList, loadingMore, loading, refresh, refreshing } =
            useLoadMore(normalRequest);
          return {
            dataList,
            loadingMore,
            loading,
            refresh,
            refreshing,
          };
        },
      }),
    );

    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    wrapper.refresh();
    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(true);
    expect(wrapper.loadingMore).toBe(false);
    await waitForTime(1000);
    expect(wrapper.dataList).toHaveLength(10);
  });

  test('cancel should work, case: 1', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const {
            dataList,
            loadingMore,
            loading,
            loadMore,
            refresh,
            refreshing,
            cancel,
            reload,
          } = useLoadMore(normalRequest);
          return {
            dataList,
            loadingMore,
            loading,
            loadMore,
            refresh,
            refreshing,
            cancel,
            reload,
          };
        },
      }),
    );

    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    await waitForTime(1000);
    expect(wrapper.loading).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);
    expect(wrapper.loadingMore).toBe(false);

    // trigger loadMore
    wrapper.loadMore();
    expect(wrapper.loading).toBe(true);
    expect(wrapper.loadingMore).toBe(true);
    expect(wrapper.refreshing).toBe(false);
    await waitForTime(100);
    // trigger cancel
    wrapper.cancel();
    expect(wrapper.loading).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);

    // trigger refresh
    wrapper.refresh();
    expect(wrapper.loading).toBe(true);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.refreshing).toBe(true);
    await waitForTime(100);
    // trigger cancel
    wrapper.cancel();
    expect(wrapper.loading).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.dataList).toHaveLength(10);

    // trigger reload
    wrapper.reload();
    expect(wrapper.loading).toBe(true);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.refreshing).toBe(false);
    await waitForTime(100);
    // trigger cancel
    wrapper.cancel();
    expect(wrapper.loading).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.dataList).toHaveLength(0);
  });

  test('cancel should work, case: 2', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { dataList, loadingMore, loading, refreshing, cancel } =
            useLoadMore(normalRequest);
          return {
            dataList,
            loadingMore,
            loading,
            refreshing,
            cancel,
          };
        },
      }),
    );

    expect(wrapper.loading).toBe(true);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.loadingMore).toBe(false);

    // trigger cancel
    wrapper.cancel();
    expect(wrapper.loading).toBe(false);
    expect(wrapper.refreshing).toBe(false);
    expect(wrapper.loadingMore).toBe(false);
    expect(wrapper.dataList).toHaveLength(0);

    await waitForTime(1000);
    expect(wrapper.dataList).toHaveLength(0);
  });

  test('useLoadMore when request error', async () => {
    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { loadingMore, loadMore } = useLoadMore(failedRequest);
          return {
            loadingMore,
            loadMore,
          };
        },
      }),
    );

    await waitForTime(1000);
    expect(wrapper.loadingMore).toBe(false);
    wrapper.loadMore();
    expect(wrapper.loadingMore).toBe(true);
    await waitForTime(1000);
    expect(wrapper.loadingMore).toBe(false);
  });

  test('onBefore and onAfter hooks can use in `useLoadMore`', async () => {
    const onBefore = jest.fn();
    const onAfter = jest.fn();

    const wrapper = mount(
      defineComponent({
        template: '<div/>',
        setup() {
          const { loadMore } = useLoadMore(normalRequest, {
            onBefore,
            onAfter,
          });
          return {
            loadMore,
          };
        },
      }),
    );

    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(onAfter).toHaveBeenCalledTimes(0);
    await waitForTime(1000);
    expect(onBefore).toHaveBeenCalledTimes(1);
    expect(onAfter).toHaveBeenCalledTimes(1);

    wrapper.loadMore();
    expect(onBefore).toHaveBeenCalledTimes(2);
    expect(onAfter).toHaveBeenCalledTimes(1);
    await waitForTime(1000);
    expect(onBefore).toHaveBeenCalledTimes(2);
    expect(onAfter).toHaveBeenCalledTimes(2);
  });
});
