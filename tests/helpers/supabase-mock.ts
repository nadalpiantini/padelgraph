// Supabase client mock helpers
import { vi } from 'vitest';

export const createMockSupabaseClient = () => {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockUpdate = vi.fn();
  const mockDelete = vi.fn();
  const mockEq = vi.fn();
  const mockIn = vi.fn();
  const mockGt = vi.fn();
  const mockLt = vi.fn();
  const mockOrder = vi.fn();
  const mockLimit = vi.fn();
  const mockSingle = vi.fn();
  const mockMaybeSingle = vi.fn();

  // Chain builder
  const chainBuilder = {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    eq: mockEq,
    in: mockIn,
    gt: mockGt,
    lt: mockLt,
    order: mockOrder,
    limit: mockLimit,
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
  };

  // Make all methods chainable
  Object.values(chainBuilder).forEach((fn) => {
    fn.mockReturnValue(chainBuilder);
  });

  mockFrom.mockReturnValue(chainBuilder);

  return {
    from: mockFrom,
    auth: {
      getUser: vi.fn(),
    },
    // Expose mocks for assertions
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      eq: mockEq,
      in: mockIn,
      gt: mockGt,
      lt: mockLt,
      order: mockOrder,
      limit: mockLimit,
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    },
  };
};

export const mockSupabaseResponse = <T>(data: T, error: unknown = null) => ({
  data,
  error,
  count: null,
  status: error ? 500 : 200,
  statusText: error ? 'Error' : 'OK',
});
