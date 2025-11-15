import Calendar from './Calendar';
import ProfileCard from './ProfileCard';

export default function FrontPage() {
  return (
    <div className="frontpage">
      <ProfileCard />
      <Calendar />
    </div>
  );
}
