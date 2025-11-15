export default function ProfileCard({ name = "John Doe", email = "john@example.com", avatar }) {
  return (
    <div className="profile">
      <img 
        className="profile-avatar" 
        src={avatar || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS8rpGyEAl2yvIk_gVGxXhOjLWH9Tis3_-SARNgAr3Pl2Qt1vkR1kmeK6A3Kj9mix3lgKFCUQ&s=10"} 
        alt={`${name} avatar`} 
      />
      <div className="profile-info">
        <h2 className="profile-name">{name}</h2>
        <p className="profile-email">{email}</p>
      </div>
    </div>
  );
}
