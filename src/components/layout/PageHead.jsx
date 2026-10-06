import React from 'react';

export function PageHead({ title, subtitle, action, children }) {
  return (
    <div className="page-head">
      <div>
        <h2 className="title-3d">{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action || children}
    </div>
  );
}
