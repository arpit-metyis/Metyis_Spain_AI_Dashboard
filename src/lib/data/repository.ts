import type { DashboardRepository } from './types';
import { AzureSqlDashboardRepository } from './azure-sql-repository';
import { MockDashboardRepository } from './mock-repository';

const mockRepository = new MockDashboardRepository();
const azureRepository = new AzureSqlDashboardRepository();

export function getDashboardRepository(): DashboardRepository {
  return process.env.DATA_SOURCE === 'azure-sql' ? azureRepository : mockRepository;
}

export async function withRepositoryFallback<T>(operation: (repo: DashboardRepository) => Promise<T>): Promise<T> {
  const primary = getDashboardRepository();
  try {
    return await operation(primary);
  } catch (error) {
    if (primary === mockRepository) throw error;
    console.warn('Azure SQL repository failed; falling back to mock repository.', error);
    return operation(mockRepository);
  }
}
