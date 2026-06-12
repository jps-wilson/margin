import { Link } from "react-router-dom";

function PageShell({ children, className, backTo, backLabel }) {
  return (
    <main className={className}>
      <div className='margin-rule' aria-hidden='true' />
      <div className='content'>
        <header className='wordmark-area'>
          <Link to='/' className='wordmark-link'>
            <span className='wordmark'>margin</span>
            <span className='microcopy'>← notes for files</span>
          </Link>
        </header>
        {backTo && (
          <Link to={backTo} className='back-link'>
            ← {backLabel || "back"}
          </Link>
        )}
        {children}
      </div>
    </main>
  );
}

export default PageShell;
