from typing import Dict, List, Any

YOGA_POSES = [
    {
        "name": "Downward Facing Dog",
        "difficulty": "Beginner",
        "benefits": "Stretches hamstrings, calves, and spine. Builds upper body strength.",
        "instructions": "Start on hands and knees. Lift hips up and back, straightening legs. Press heels toward the floor.",
        "key_angles": {"hip_flexion": 90, "spine_neutral": True},
    },
    {
        "name": "Warrior I",
        "difficulty": "Beginner",
        "benefits": "Strengthens legs, opens chest and shoulders.",
        "instructions": "Step one foot back, turn it out slightly. Bend front knee to 90 degrees. Reach arms up.",
        "key_angles": {"front_knee": 90},
    },
    {
        "name": "Warrior II",
        "difficulty": "Beginner",
        "benefits": "Increases stamina, strengthens legs and ankles.",
        "instructions": "From Warrior I, open hips and chest to the side. Extend arms parallel to the floor.",
        "key_angles": {"front_knee": 90, "arms_horizontal": True},
    },
    {
        "name": "Tree Pose",
        "difficulty": "Intermediate",
        "benefits": "Improves balance and focus. Strengthens thighs, calves, ankles.",
        "instructions": "Shift weight to one leg. Place other foot on inner thigh or calf. Bring hands to prayer position.",
        "key_angles": {"standing_leg_straight": True},
    },
    {
        "name": "Cobra Pose",
        "difficulty": "Beginner",
        "benefits": "Strengthens spine, stretches chest and lungs.",
        "instructions": "Lie on belly, hands under shoulders. Lift chest off the floor, keeping elbows close to body.",
        "key_angles": {"spine_extension": 30},
    },
    {
        "name": "Plank Pose",
        "difficulty": "Beginner",
        "benefits": "Strengthens core, arms, and wrists.",
        "instructions": "From Downward Dog, shift forward so shoulders are over wrists. Body should form a straight line.",
        "key_angles": {"body_line": 180},
    },
    {
        "name": "Triangle Pose",
        "difficulty": "Intermediate",
        "benefits": "Stretches legs, opens chest and shoulders.",
        "instructions": "Step feet wide apart. Reach one arm down to shin or floor, other arm up to sky.",
        "key_angles": {"side_bend": 90},
    },
    {
        "name": "Child's Pose",
        "difficulty": "Beginner",
        "benefits": "Gently stretches hips, thighs, and ankles. Calms the brain.",
        "instructions": "Kneel on floor, touch big toes together. Sit back on heels and fold forward, arms extended.",
        "key_angles": {"hip_flexion": 45},
    },
    # 8+ new poses
    {
        "name": "Bridge Pose",
        "difficulty": "Beginner",
        "benefits": "Strengthens back, glutes, and hamstrings. Opens chest and hip flexors.",
        "instructions": "Lie on back, knees bent, feet hip-width. Press hips up, clasp hands under back.",
        "key_angles": {"hip_extension": 45},
    },
    {
        "name": "Chair Pose",
        "difficulty": "Intermediate",
        "benefits": "Builds leg and core strength. Improves balance and ankle stability.",
        "instructions": "Stand with feet together, sit back as if in a chair. Arms reach overhead, spine long.",
        "key_angles": {"knee_flexion": 90},
    },
    {
        "name": "Pigeon Pose",
        "difficulty": "Intermediate",
        "benefits": "Deep hip opener. Relieves lower back tension and improves flexibility.",
        "instructions": "From Downward Dog, bring one knee forward behind wrist. Extend back leg, square hips.",
        "key_angles": {"hip_external_rotation": 90},
    },
    {
        "name": "Boat Pose",
        "difficulty": "Intermediate",
        "benefits": "Strengthens core, hip flexors, and spine. Improves balance.",
        "instructions": "Sit with knees bent, lean back slightly. Lift feet, extend legs to 45 degrees. Arms parallel to floor.",
        "key_angles": {"hip_flexion": 45, "spine_neutral": True},
    },
    {
        "name": "Camel Pose",
        "difficulty": "Advanced",
        "benefits": "Opens chest and front body. Strengthens back muscles.",
        "instructions": "Kneel upright, hands on lower back. Arch back gently, reach for heels if comfortable.",
        "key_angles": {"spine_extension": 60},
    },
    {
        "name": "Half Moon Pose",
        "difficulty": "Advanced",
        "benefits": "Improves balance, coordination, and leg strength. Opens hips and chest.",
        "instructions": "From Triangle, bend front knee, place hand on floor. Lift back leg parallel, open chest to side.",
        "key_angles": {"standing_leg_straight": True, "lifted_leg": 90},
    },
    {
        "name": "Seated Forward Fold",
        "difficulty": "Beginner",
        "benefits": "Calms nervous system. Stretches hamstrings and lower back.",
        "instructions": "Sit with legs extended. Hinge at hips, reach toward feet. Keep spine long.",
        "key_angles": {"hip_flexion": 90},
    },
    {
        "name": "Revolved Triangle",
        "difficulty": "Advanced",
        "benefits": "Improves spinal mobility and digestion. Strengthens legs.",
        "instructions": "From Triangle, rotate torso, bring opposite hand to floor or block. Reach top arm up.",
        "key_angles": {"spine_rotation": 45},
    },
    {
        "name": "Corpse Pose",
        "difficulty": "Beginner",
        "benefits": "Deep relaxation and stress relief. Integrates practice benefits.",
        "instructions": "Lie flat on back, arms at sides, palms up. Close eyes, release all tension, breathe naturally.",
        "key_angles": {"body_neutral": True},
    },
]


def get_yoga_poses() -> List[Dict[str, Any]]:
    return YOGA_POSES
