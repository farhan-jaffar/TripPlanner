# Data migration to assign existing orphan trips and ensure profiles exist

from django.db import migrations


def assign_orphan_trips_and_profiles(apps, schema_editor):
    User = apps.get_model("auth", "User")
    Profile = apps.get_model("trips", "Profile")
    Trip = apps.get_model("trips", "Trip")

    # Ensure all existing users have a Profile
    for user in User.objects.all():
        Profile.objects.get_or_create(user=user)

    # Check for orphan trips
    orphan_trips = Trip.objects.filter(owner__isnull=True)
    if orphan_trips.exists():
        default_user = User.objects.first()
        if not default_user:
            default_user = User.objects.create_user(
                username="default_user",
                email="default@example.com",
                password="defaultPassword123!",
            )
            Profile.objects.get_or_create(user=default_user)
        orphan_trips.update(owner=default_user)


class Migration(migrations.Migration):

    dependencies = [
        ("trips", "0002_trip_owner_profile"),
    ]

    operations = [
        migrations.RunPython(
            assign_orphan_trips_and_profiles,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
