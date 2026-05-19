import "./App.css";

function App() {
  return (
    <main className='landing'>
      <div className='margin-rule' aria-hidden='true' />

      <div className='content'>
        <header className='wordmark-area'>
          <span className='wordmark'>margin</span>
          <span className='microcopy'>← notes for files</span>
        </header>

        <section className='hero'>
          <h1 className='headline'>
            What
            <br />
            <span className='ember'>changed.</span>
          </h1>

          <p className='subhead'>
            A changelog for Figma files.
            <br />
            Pick two versions, get a list you can actually read.
          </p>

          <a className='cta-button' href='http://localhost:3000/auth/figma'>
            <span>Connect Figma</span>
            <span className='arrow' aria-hidden='true'>
              →
            </span>
          </a>

          <p className='caption'>takes 8 seconds</p>
        </section>
      </div>
    </main>
  );
}

export default App;
