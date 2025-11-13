export type JobSpec = {
  [jobName: string]: {
    depends_on?: string[];
    impact?: number;
  } | null;
};


{
  job_name: string;
  tables: string[];
  innerJoin?: { tablesUsed: string[]; attr_list: string[] }[] | null;
  leftJoin?: ...
  rightJoin?: ...
}


export type JoinEntry = {
  tablesUsed: string[];   // e.g. ["Table1", "Table2"]
  attr_list: string[];    // e.g. ["t1.id = t2.id"]
};

export type JobErSpec = {
  job_name: string;
  tables: string[];
  innerJoin?: JoinEntry[] | null;
  leftJoin?: JoinEntry[] | null;
  rightJoin?: JoinEntry[] | null;
};

