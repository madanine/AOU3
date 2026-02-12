-- Function to check deadline before submission
CREATE OR REPLACE FUNCTION public.check_assignment_deadline() RETURNS TRIGGER AS $$
DECLARE v_deadline TIMESTAMPTZ;
BEGIN -- Retrieve the assignment deadline from the assignments table
SELECT deadline INTO v_deadline
FROM public.assignments
WHERE id = NEW.assignment_id;
-- Logic:
-- 1. If deadline is NULL, assume no deadline (allow submission).
-- 2. If NOW() > deadline, reject.
-- Usiing NOW() ensures server time is used (UTC).
IF v_deadline IS NOT NULL
AND NOW() > v_deadline THEN RAISE EXCEPTION 'Deadline has passed. Submission is closed.';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Trigger to enforce the check on INSERT (new submission) or UPDATE (edit submission)
DROP TRIGGER IF EXISTS prevent_late_submissions ON public.submissions;
CREATE TRIGGER prevent_late_submissions BEFORE
INSERT
    OR
UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.check_assignment_deadline();