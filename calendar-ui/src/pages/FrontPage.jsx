import Calendar from './Calendar';
import ProfileCard from './ProfileCard';
import Navigation from '../routes/Navigation'

export default function FrontPage() {
  return (
    <div className="frontpage">
      <Navigation />
      <ProfileCard />
      <Calendar />
    </div>
  );
}
