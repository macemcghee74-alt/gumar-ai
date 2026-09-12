export type TrainingJob = {
  id: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  externalJobId?: string;
  resultModel?: string;
};

export interface TrainingProvider {
  readonly name: string;
  uploadDataset(dataset: string, options?: { signal?: AbortSignal }): Promise<{ datasetId: string }>;
  createTrainingJob(input: { datasetId: string; baseModel: string }, options?: { signal?: AbortSignal }): Promise<TrainingJob>;
  getTrainingJob(id: string, options?: { signal?: AbortSignal }): Promise<TrainingJob>;
  cancelTrainingJob(id: string, options?: { signal?: AbortSignal }): Promise<TrainingJob>;
  getModel(id: string, options?: { signal?: AbortSignal }): Promise<{ id: string; status: string }>;
  listModels(options?: { signal?: AbortSignal }): Promise<Array<{ id: string; status: string }>>;
}

export function getTrainingProvider(): TrainingProvider | null {
  return null;
}
