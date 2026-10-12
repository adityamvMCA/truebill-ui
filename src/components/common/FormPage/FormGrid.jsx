function FormGrid({ columns = 2, children }) {
  return (
    <div className="fp-grid" style={{ "--fp-cols": columns }}>
      {children}
    </div>
  );
}

export function FormFull({ children }) {
  return <div className="fp-full">{children}</div>;
}

export default FormGrid;