// shared wrapper with the header
function PageShell({ children, className }) {
  return (
    <main className={className}>
      <div className='margin-rule' aria-hidden='true' />
      <div className='content'>
        <header className='wordmark-area'>
          <span className='wordmark'>margin</span>
          <span className='microcopy'>← notes for files</span>
        </header>
        {children}
      </div>
    </main>
  );
}

export default PageShell;
