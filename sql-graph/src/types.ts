
export type JobSpec = {
  [jobName: string]: {
    depends_on?: string[];
    impact?: number;
  } | null;
};
