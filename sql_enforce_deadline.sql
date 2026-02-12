-- Part 1: Create the Function
-- Run this block first!
CREATE OR REPLACE FUNCTION public.check_assignment_deadline() RETURNS TRIGGER AS $$
DECLARE v_deadline TIMESTAMPTZ;
BEGIN -- Retrieve the assignment deadline
SELECT deadline INTO v_deadline
FROM public.assignments
WHERE id = NEW.assignment_id;
-- 1. If deadline is NULL, assume no deadline (allow submission).
-- 2. If NOW() > deadline, reject.
IF v_deadline IS NOT NULL
AND NOW() > v_deadline THEN RAISE EXCEPTION 'Deadline has passed. Submission is closed.';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Part 2: Create the Trigger
-- Run this block second!
DROP TRIGGER IF EXISTS prevent_late_submissions ON public.submissions;
CREATE TRIGGER prevent_late_submissions BEFORE
INSERT
    OR
UPDATE ON public.submissions FOR EACH ROW EXECUTE FUNCTION public.check_assignment_deadline();