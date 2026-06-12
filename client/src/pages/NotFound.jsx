import PageShell from "../components/PageShell";
import PageState from "../components/PageState";

function NotFound() {
  return (
    <PageShell className='not-found-page'>
      <PageState
        state='empty'
        title='Page not found'
        message="This page doesn't exist."
        actionLabel='Back to home'
        actionTo='/'
      />
    </PageShell>
  );
}

export default NotFound;
