import { formatJobDate, type ScheduledJob } from "#/domain/jobs";

export function Job({ job }: { job: ScheduledJob }) {
  return (
    <li className="border-l-2 border-leaf pl-3">
      <p className="text-sm text-soil">{formatJobDate(job.month, job.day)}</p>
      <p className="font-medium">
        {job.title} · {job.plantName}
      </p>
      <p className="text-sm leading-relaxed">{job.detail}</p>
    </li>
  );
}
