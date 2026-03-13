-- Add image_url to categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS image_url text;

-- Function to update product stock based on available logs
CREATE OR REPLACE FUNCTION public.update_product_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.products 
        SET stock = (SELECT COUNT(*) FROM public.account_logs WHERE product_id = NEW.product_id AND is_sold = false)
        WHERE id = NEW.product_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.products 
        SET stock = (SELECT COUNT(*) FROM public.account_logs WHERE product_id = OLD.product_id AND is_sold = false)
        WHERE id = OLD.product_id;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- If product_id changed (rare but possible)
        IF (OLD.product_id <> NEW.product_id) THEN
            UPDATE public.products 
            SET stock = (SELECT COUNT(*) FROM public.account_logs WHERE product_id = OLD.product_id AND is_sold = false)
            WHERE id = OLD.product_id;
        END IF;
        
        UPDATE public.products 
        SET stock = (SELECT COUNT(*) FROM public.account_logs WHERE product_id = NEW.product_id AND is_sold = false)
        WHERE id = NEW.product_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for account_logs
DROP TRIGGER IF EXISTS tr_update_stock ON public.account_logs;
CREATE TRIGGER tr_update_stock
AFTER INSERT OR UPDATE OR DELETE ON public.account_logs
FOR EACH ROW EXECUTE FUNCTION public.update_product_stock();

-- Initialize current stocks based on logs
UPDATE public.products p
SET stock = (SELECT COUNT(*) FROM public.account_logs l WHERE l.product_id = p.id AND l.is_sold = false);
