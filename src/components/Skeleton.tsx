import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'text', 
  width, 
  height, 
  lines = 1 
}) => {
  const baseClasses = 'skeleton skeleton--' + variant;
  const combinedClasses = `${baseClasses} ${className}`.trim();
  
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`skeleton-text-group ${className}`} style={style}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={`${baseClasses} ${i === lines - 1 ? 'skeleton--last' : ''}`}
            style={{
              width: i === lines - 1 ? '70%' : '100%',
              ...style
            }}
          />
        ))}
      </div>
    );
  }

  return <div className={combinedClasses} style={style} />;
};

// Product skeleton for the product cards (card layout)
export const ProductSkeleton: React.FC = () => (
  <div className="product-card product-card-skeleton">
    <div className="product-card-image-wrap">
      <Skeleton variant="rectangular" width="100%" height="100%" className="skeleton--rectangular" />
    </div>
    <div className="product-card-body">
      <Skeleton width={60} height={10} style={{ marginBottom: 6 }} />
      <Skeleton width="85%" height={16} style={{ marginBottom: 6 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="70%" height={14} />
    </div>
    <div className="product-card-meta">
      <div className="product-card-stock-wrap">
        <Skeleton width={36} height={9} style={{ margin: "0 auto 4px" }} />
        <Skeleton width={28} height={18} style={{ margin: "0 auto" }} />
      </div>
      <div className="product-card-price-wrap">
        <Skeleton width={32} height={9} style={{ margin: "0 auto 4px" }} />
        <Skeleton width={56} height={16} style={{ margin: "0 auto" }} />
      </div>
    </div>
    <div className="product-card-cta">
      <Skeleton width="100%" height={44} style={{ borderRadius: 10 }} />
    </div>
  </div>
);

// Category skeleton for category cards (matches horizontal card layout)
export const CategorySkeleton: React.FC = () => (
  <div className="category-card skeleton-card">
    <div className="category-card-icon">
      <Skeleton variant="rectangular" width={52} height={52} style={{ borderRadius: 14 }} />
    </div>
    <div className="category-card-body">
      <Skeleton width="70%" height={18} className="category-card-title" style={{ marginBottom: 6 }} />
      <Skeleton width="45%" height={14} className="category-card-count" />
    </div>
    <div className="category-card-arrow">
      <Skeleton width={12} height={12} style={{ borderRadius: 2 }} />
    </div>
  </div>
);

// List row product skeleton
export const ProductRowSkeleton: React.FC = () => (
  <div className="account-row skeleton-row">
    <div className="acc-platform-icon">
      <Skeleton variant="rectangular" width={44} height={44} className="skeleton--rectangular" style={{ borderRadius: 12 }} />
    </div>
    <div className="acc-info">
      <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
      <Skeleton width="100%" height={14} style={{ marginBottom: 4 }} />
      <Skeleton width="40%" height={12} />
    </div>
    <div className="acc-stock-price">
      <div style={{ textAlign: "center" }}>
        <Skeleton width={36} height={10} style={{ margin: "0 auto 4px" }} />
        <Skeleton width={28} height={18} style={{ margin: "0 auto" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <Skeleton width={32} height={10} style={{ margin: "0 auto 4px" }} />
        <Skeleton width={48} height={16} style={{ margin: "0 auto" }} />
      </div>
    </div>
    <Skeleton width={100} height={40} style={{ borderRadius: 8 }} />
  </div>
);

// Grid of product skeletons
export const ProductGridSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="products-grid">
    {Array.from({ length: count }, (_, i) => (
      <ProductSkeleton key={i} />
    ))}
  </div>
);

// List of product skeletons
export const ProductListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="product-list">
    {Array.from({ length: count }, (_, i) => (
      <ProductRowSkeleton key={i} />
    ))}
  </div>
);

// Grid of category skeletons
export const CategoryGridSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="categories-grid">
    {Array.from({ length: count }, (_, i) => (
      <CategorySkeleton key={i} />
    ))}
  </div>
);

export default Skeleton;
